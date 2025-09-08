// assets/scripts/app.js

// State Management
let allBranches = []; // ข้อมูลทั้งหมดจาก DB
let filteredBranches = []; // ข้อมูลที่ผ่านการกรอง
let currentPage = 1;
let pageSize = 100;
let currentDataSource = { name: "ยังไม่มีข้อมูล", status: "" };
let exportType = null; // ตัวแปรสำหรับจำประเภทไฟล์ที่จะ Export ('excel' หรือ 'csv')
let branchBeforeEdit = null; // NEW: ตัวแปรสำหรับเก็บข้อมูลสาขาก่อนที่จะถูกแก้ไข

// ตัวแปรสำหรับสถานะการเรียงข้อมูล
let sortColumn = 'storeCode'; // คอลัมน์เริ่มต้นที่ใช้เรียง
let sortDirection = 'asc';    // ทิศทางเริ่มต้น 'asc' (น้อยไปมาก)
let statusChart;// ตัวแปรสำหรับเก็บ instance ของ Chart

// ฟังก์ชันเริ่มต้นการทำงานของแอปพลิเคชัน
async function initializeApp() {
    pageSize = parseInt(DOMElements.pageSizeSelect.value);
    setupEventListeners();

    const savedSource = await db.meta.get('dataSource');
    if (savedSource) {
        // แปลง String กลับเป็น Date Object
        savedSource.value.timestamp = new Date(savedSource.value.timestamp);
        currentDataSource = savedSource.value;
    }
    displayDataSource();

    setupChart(); // เรียกใช้ฟังก์ชันตั้งค่า Chart
    await loadDataFromDB();
}

// ฟังก์ชันสำหรับสร้างและตั้งค่า Chart
function setupChart() {
    const ctx = DOMElements.statusChartCanvas.getContext('2d');
    const config = {
        type: 'bar',
        data: {
            labels: ['CO', 'SBP', 'Sub-Area', 'ปตท'],
            datasets: [{
                label: 'Online',
                data: [],
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderColor: 'rgba(22, 163, 74, 1)',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
            }, {
                label: 'Offline',
                data: [],
                backgroundColor: 'rgba(220, 38, 38, 0.8)',
                borderColor: 'rgba(185, 28, 28, 1)',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'เปรียบเทียบสถานะการเชื่อมต่อระบบ CCTV แยกตามประเภทสาขา',
                    color: '#374151',
                    font: { size: 14, weight: 'bold' },
                    padding: { top: 10, bottom: 20 }
                },
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#ff6b35',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            const branchTypes = {
                                'CO': 'Company Owned (สาขาของบริษัท)', 'SBP': 'Sub Business Partner (พันธมิตรทางธุรกิจ)',
                                'Sub-Area': 'พื้นที่ย่อย', 'ปตท': 'PTT Station (สถานีน้ำมัน ปตท.)'
                            };
                            return branchTypes[context[0].label] || context[0].label;
                        },
                        label: function(context) { return `${context.dataset.label}: ${context.parsed.y} สาขา`; },
                        afterLabel: function(context) {
                            const total = context.chart.data.datasets.reduce((sum, dataset) => sum + dataset.data[context.dataIndex], 0);
                            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                            return `คิดเป็น ${percentage}% ของสาขาประเภทนี้`;
                        },
                        footer: function(context) {
                            if (context.length > 0) {
                                const dataIndex = context[0].dataIndex;
                                const onlineData = context[0].chart.data.datasets[0].data[dataIndex];
                                const offlineData = context[0].chart.data.datasets[1].data[dataIndex];
                                const total = onlineData + offlineData;
                                const rate = ((onlineData / total) * 100).toFixed(1);
                                return `\nอัตราเชื่อมต่อ: ${rate}% (${onlineData}/${total} สาขา)`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    grid: { display: false },
                    ticks: { color: '#4b5563', font: { weight: 'bold', size: 13 } },
                    title: { display: true, text: 'ประเภทสาขา', color: '#6b7280', font: { size: 12, weight: 'bold' } }
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#6b7280', font: { size: 12 }, callback: function(value) { return value + ' สาขา'; } },
                    title: { display: true, text: 'จำนวนสาขา', color: '#6b7280', font: { size: 12, weight: 'bold' } }
                }
            },
            elements: { bar: { maxBarThickness: 60 } },
            animation: { duration: 1500, easing: 'easeInOutCubic' }
        }
    };
    window.statusChart = new Chart(ctx, config);
}

// โหลดข้อมูลจาก IndexedDB
async function loadDataFromDB() {
    showLoadingMessage("กำลังโหลดข้อมูลจากฐานข้อมูล...");
    try {
        allBranches = await db.branches.toArray();
        applyFilters();
    } catch (error) {
        console.error("Failed to load data from DB:", error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถโหลดข้อมูลเริ่มต้นได้' });
    }
}

// ฟังก์ชันสำหรับอัปเดตข้อมูลแหล่งที่มา ทั้งใน UI และ DB
async function updateDataSource(name, status) {
    const timestamp = new Date();
    currentDataSource = { name, status, timestamp };
    
    // บันทึกข้อมูลลง DB
    await db.meta.put({ key: 'dataSource', value: currentDataSource });

    // อัปเดตการแสดงผล
    displayDataSource();
}

// ฟังก์ชันสำหรับแสดงผลข้อมูลแหล่งที่มาบนหน้าจอ
function displayDataSource() {
    const { name, status, timestamp } = currentDataSource;
    let statusText = '';
    if (status === 'modified') {
        statusText = ' (แก้ไขแล้ว)';
    }

    const timeString = timestamp ? `(${timestamp.toLocaleString('th-TH')})` : '';

    DOMElements.dataSourceInfo.innerHTML = `
        แหล่งข้อมูล: <span>${name}${statusText}</span>
        <span class="timestamp">อัปเดตล่าสุด: ${timeString}</span>
    `;
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);