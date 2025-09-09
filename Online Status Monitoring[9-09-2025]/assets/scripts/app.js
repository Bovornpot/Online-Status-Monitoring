// assets/scripts/app.js

// State Management
let allBranches = []; // ข้อมูลทั้งหมดจาก DB
let filteredBranches = []; // ข้อมูลที่ผ่านการกรอง
let currentPage = 1;
let pageSize = 100;
let currentDataSource = { name: "ยังไม่มีข้อมูล", status: "" };
let exportType = null; // ตัวแปรสำหรับจำประเภทไฟล์ที่จะ Export ('excel' หรือ 'csv')
let branchBeforeEdit = null; // ตัวแปรสำหรับเก็บข้อมูลสาขาก่อนที่จะถูกแก้ไข

// ตัวแปรสำหรับสถานะการเรียงข้อมูล
let sortColumn = 'storeCode'; // คอลัมน์เริ่มต้นที่ใช้เรียง
let sortDirection = 'asc';    // ทิศทางเริ่มต้น 'asc' (น้อยไปมาก)
let statusChart;// ตัวแปรสำหรับเก็บ instance ของ Chart สถานะ
let regionChart; // ตัวแปรสำหรับเก็บ instance ของ Chart ภาค
let provinceChart; // ตัวแปรสำหรับเก็บ instance ของ Chart จังหวัด

// ฟังก์ชันเริ่มต้นการทำงานของแอปพลิเคชัน
async function initializeApp() {
    pageSize = parseInt(DOMElements.pageSizeSelect.value);
    // สร้าง/ตั้งค่า Chart ก่อน เพื่อให้ refreshUI() เรียก updateCharts() ได้ปลอดภัย
    try {
        setupChart();
        showChartTab("status"); 
        
    } catch (err) {
        console.warn('setupChart() failed:', err);
    }

    setupEventListeners();
    const savedSource = await db.meta.get('dataSource');
    if (savedSource) {
        // แปลง String กลับเป็น Date Object
        savedSource.value.timestamp = new Date(savedSource.value.timestamp);
        currentDataSource = savedSource.value;
    }
    displayDataSource();
    // โหลดข้อมูลหลังจาก chart ถูกสร้างแล้ว
    await loadDataFromDB();
}

// ฟังก์ชันสำหรับสร้างและตั้งค่า Chart
function setupChart() {
    // const ctx = DOMElements.statusChartCanvas.getContext('2d');
    const config = {
        type: 'bar',
        data: {
            labels: [],
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
                    text: '', // Text will be set dynamically
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
                            // This will be handled by a separate function
                            return context[0].label;
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
                    title: { display: true, text: '', color: '#6b7280', font: { size: 12, weight: 'bold' } }
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
    // Status Chart
    if (DOMElements.statusChartCanvas) {
        if (statusChart) { statusChart.destroy(); }
        const ctx = DOMElements.statusChartCanvas.getContext('2d');
        statusChart = new Chart(ctx, JSON.parse(JSON.stringify(config))); // deep copy to be safe
        // optional: expose globally for debug
        window.statusChart = statusChart;
    }

    // Region Chart
    if (DOMElements.regionChartCanvas) {
        if (regionChart) { regionChart.destroy(); }
        const ctxR = DOMElements.regionChartCanvas.getContext('2d');
        regionChart = new Chart(ctxR, JSON.parse(JSON.stringify(config)));
        window.regionChart = regionChart;
    }

    // Province Chart
    if (DOMElements.provinceChartCanvas) {
        if (provinceChart) { provinceChart.destroy(); }
        const ctxP = DOMElements.provinceChartCanvas.getContext('2d');
        provinceChart = new Chart(ctxP, JSON.parse(JSON.stringify(config)));
        window.provinceChart = provinceChart;
    }

    // ให้แน่ใจว่า updateCharts สามารถเรียกใช้ได้จากภายนอก (ui.js จะเรียก)
    window.updateCharts = updateCharts;
}

// ฟังก์ชันสำหรับอัปเดตข้อมูลกราฟทั้งหมด
// ฟังก์ชันสำหรับอัปเดตข้อมูลกราฟทั้งหมด
// ฟังก์ชันสำหรับอัปเดตข้อมูลกราฟทั้งหมด (แก้ไขให้ใช้ branch.status เหมือนภาค/จังหวัด)
function updateCharts() {
    // สร้างรายการสถานะ ภาค จังหวัด จากข้อมูลทั้งหมด (allBranches) เพื่อให้แกน X คงที่เหมือน region/province
    const allStatuses = [...new Set(allBranches.map(b => (b.status || 'ไม่ระบุ')))].sort();
    const allRegions = [...new Set(allBranches.map(b => b.region).filter(Boolean))].sort();
    const allProvinces = [...new Set(allBranches.map(b => b.province).filter(Boolean))].sort();

    // เตรียมตัวเก็บค่าเริ่มต้น (ให้ครบทุกสถานะ/ภาค/จังหวัด)
    const make = () => ({ online: 0, offline: 0 });
    const statusCounts = Object.fromEntries(allStatuses.map(s => [s, make()]));
    const regionData = Object.fromEntries(allRegions.map(r => [r, make()]));
    const provinceData = Object.fromEntries(allProvinces.map(p => [p, make()]));

    // ใช้ filteredBranches ถ้ามีการกรอง มิฉะนั้นใช้ allBranches
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;

    // ใช้เงื่อนไขเดียวกับ ui.js: พิจารณาว่า Online คือค่าเท่ากับ 'สามารถเชื่อม Online'
    for (const branch of source) {
        const status = branch.status || 'ไม่ระบุ';
        const isOnline = branch.onlineStatus === 'สามารถเชื่อม Online';

        // เพิ่มค่าให้ statusCounts (ถ้า status ใหม่ที่ไม่ได้อยู่ใน allStatuses จะไม่เกิด แต่เรากำหนด allStatuses จาก allBranches ดังนั้นควรครบ)
        if (!statusCounts[status]) statusCounts[status] = make();
        if (isOnline) statusCounts[status].online++; else statusCounts[status].offline++;

        // เพิ่มค่า region
        if (branch.region) {
            if (!regionData[branch.region]) regionData[branch.region] = make();
            if (isOnline) regionData[branch.region].online++; else regionData[branch.region].offline++;
        }

        // เพิ่มค่า province
        if (branch.province) {
            if (!provinceData[branch.province]) provinceData[branch.province] = make();
            if (isOnline) provinceData[branch.province].online++; else provinceData[branch.province].offline++;
        }
    }

    // --- อัปเดต statusChart (แกน X มาจาก allStatuses, ค่ามาจาก statusCounts) ---
    if (statusChart && statusChart.data && Array.isArray(statusChart.data.datasets) && statusChart.data.datasets.length >= 2) {
        statusChart.data.labels = allStatuses;
        statusChart.data.datasets[0].data = allStatuses.map(s => statusCounts[s]?.online ?? 0);
        statusChart.data.datasets[1].data = allStatuses.map(s => statusCounts[s]?.offline ?? 0);
        if (statusChart.options?.plugins?.title) {
            statusChart.options.plugins.title.text = 'สถานะการเชื่อมต่อแยกตามสถานะ';
        }
        statusChart.update();
    }

    // --- อัปเดต regionChart ---
    if (regionChart && regionChart.data && Array.isArray(regionChart.data.datasets) && regionChart.data.datasets.length >= 2) {
        regionChart.data.labels = allRegions;
        regionChart.data.datasets[0].data = allRegions.map(r => regionData[r]?.online ?? 0);
        regionChart.data.datasets[1].data = allRegions.map(r => regionData[r]?.offline ?? 0);
        if (regionChart.options?.plugins?.title) {
            regionChart.options.plugins.title.text = 'สถานะการเชื่อมต่อแยกตามภาค';
        }
        regionChart.update();
    }

    // --- อัปเดต provinceChart ---
    if (provinceChart && provinceChart.data && Array.isArray(provinceChart.data.datasets) && provinceChart.data.datasets.length >= 2) {
        provinceChart.data.labels = allProvinces;
        provinceChart.data.datasets[0].data = allProvinces.map(p => provinceData[p]?.online ?? 0);
        provinceChart.data.datasets[1].data = allProvinces.map(p => provinceData[p]?.offline ?? 0);
        if (provinceChart.options?.plugins?.title) {
            provinceChart.options.plugins.title.text = 'สถานะการเชื่อมต่อแยกตามจังหวัด';
        }
        provinceChart.update();
    }

    // เก็บ aggregate ไว้ให้ UI/summary อ้างอิงได้ (ถ้าต้องการ)
    window.chartAggregates = { statusCounts, regionData, provinceData, allStatuses, allRegions, allProvinces };
}



// โหลดข้อมูลจาก IndexedDB
async function loadDataFromDB() {
    showLoadingMessage("กำลังโหลดข้อมูลจากฐานข้อมูล...");
    try {
        allBranches = await db.branches.toArray();
        console.log("ตรวจสอบข้อมูล branches ตัวอย่าง:", allBranches.slice(0, 10));
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