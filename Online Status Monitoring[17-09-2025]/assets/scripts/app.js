// assets/scripts/app.js

// State Management
let allBranches = []; // ข้อมูลทั้งหมดจาก DB
let filteredBranches = []; // ข้อมูลที่ผ่านการกรอง
let currentPage = 1;
let pageSize = 100;
let currentDataSource = { name: "ยังไม่มีข้อมูล", status: "" };
let exportType = null; // ตัวแปรสำหรับจำประเภทไฟล์ที่จะ Export 
let branchBeforeEdit = null; // ตัวแปรสำหรับเก็บข้อมูลสาขาก่อนที่จะถูกแก้ไข

// ตัวแปรสำหรับสถานะการเรียงข้อมูล
let sortColumn = 'storeCode'; // คอลัมน์เริ่มต้นที่ใช้เรียง
let sortDirection = 'asc';    // ทิศทางเริ่มต้น 'asc' (น้อยไปมาก)
let statusChart;// ตัวแปรสำหรับเก็บ instance ของ Chart สถานะ
let regionChart; // ตัวแปรสำหรับเก็บ instance ของ Chart ภาค
let provinceChart; // ตัวแปรสำหรับเก็บ instance ของ Chart จังหวัด
let fullChart = null; // chart สำหรับ modal view

let regionMap = {};
let provinceMap = {};
let statusMap = {};

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
    try {
        updateCharts();
    } catch (err) {
        console.warn('updateCharts() failed:', err);
    }
}

// --- สร้าง/ตั้งค่า Chart ทั้งหมด ---
function setupChart() {
    // base config generator
    function baseConfig(indexAxis = 'x', title = '') {
        return {
            type: 'bar',
            data: { labels: [], datasets: [
                { label: 'Online', data: [], backgroundColor: 'rgba(34, 197, 94, 0.85)', borderColor: 'rgba(22,163,74,1)', borderWidth: 1 },
                { label: 'Offline', data: [], backgroundColor: 'rgba(220,38,38,0.85)', borderColor: 'rgba(185,28,28,1)', borderWidth: 1 }
            ]},
            options: {
                indexAxis: indexAxis, // 'x' = vertical bars, 'y' = horizontal bars
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: !!title, text: title, font: { size: 14, weight: 'bold' } },
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed !== undefined ? context.parsed : context.raw} สาขา`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                    },
                    y: {
                        stacked: false
                    }
                },
                elements: { bar: { borderRadius: 6 } },
                animation: { duration: 600 }
            }
        };
    }

    // destroy if exist
    try { if (statusChart) statusChart.destroy(); } catch(e){}
    try { if (regionChart) regionChart.destroy(); } catch(e){}
    try { if (provinceChart) provinceChart.destroy(); } catch(e){}

    // create statusChart (vertical)
    if (DOMElements.statusChartCanvas) {
        const ctx = DOMElements.statusChartCanvas.getContext('2d');
        statusChart = new Chart(ctx, baseConfig('x', 'กราฟการเชื่อมต่อแยกตามภาคสถานะ'));
        window.statusChart = statusChart;
    }

    // create regionChart (horizontal)
    if (DOMElements.regionChartCanvas) {
        const ctxR = DOMElements.regionChartCanvas.getContext('2d');
        regionChart = new Chart(ctxR, baseConfig('y', 'กราฟการเชื่อมต่อแยกตามภาค (Top 5)'));
        window.regionChart = regionChart;
    }

    // create provinceChart (horizontal)
    if (DOMElements.provinceChartCanvas) {
        const ctxP = DOMElements.provinceChartCanvas.getContext('2d');
        provinceChart = new Chart(ctxP, baseConfig('y', 'กราฟการเชื่อมต่อแยกตามจังหวัด (Top 5)'));
        window.provinceChart = provinceChart;
    }

    // expose functions
    window.updateCharts = updateCharts;
    window.updateRegionChart = updateRegionChart;
    window.updateProvinceChart = updateProvinceChart;
    window.openFullChartModal = openFullChartModal;
    window.closeFullChartModal = closeFullChartModal;
}

// --- Helper: สร้าง counts จาก source โดยใช้ field เช่น 'status'/'region'/'province' ---
function getCountsByField(source, field) {
    const m = {};
    (source || []).forEach(b => {
        // console.log("branch sample:", b); // เช็กโครงสร้าง object
        const key = (b[field] || 'ไม่ระบุ').toString();
        if (!m[key]) m[key] = { online: 0, offline: 0, total: 0 };
        const isOnline = b.onlineStatus === 'สามารถเชื่อม Online';
        if (isOnline) m[key].online++; else m[key].offline++;
        m[key].total++;
    });
    console.log(`getCountsByField(${field}) =>`, m);
    return m;
}

// --- Helper: แปลง map เป็น array และเรียง/ตัด topN ตาม sortMode ---
// assets/scripts/app.js

// --- Helper: แปลง map เป็น array และเรียง/ตัด topN ตาม sortMode ---
function sortAndSliceCounts(mapObj, sortMode='online_desc', topN=null) {
    const arr = Object.keys(mapObj).map(k => {
        const item = { label: k, ...mapObj[k] };
        // คำนวณ rate สำหรับใช้ในการเรียง
        item.rate = item.total > 0 ? (item.online / item.total) : 0; 
        return item;
    });

    const [field, dir] = sortMode.split('_'); // e.g. online_desc
    arr.sort((a,b) => {
        let va, vb;
        if (field === 'rate') {
            va = a.rate;
            vb = b.rate;
        } else {
            va = a[field] || 0;
            vb = b[field] || 0;
        }

        if (va === vb) return b.total - a.total; // tie-breaker by total desc
        return dir === 'asc' ? va - vb : vb - va;
    });
    if (topN && arr.length > topN) return arr.slice(0, topN);
    return arr;
}


// --- อัปเดตกราฟทั้งหมด (status vertical + region/province top5 horizontal) ---
function updateCharts() {
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;

    // 1) Status chart (vertical) - labels = unique statuses
    const statusMap = getCountsByField(source, 'status');
    const statusArr = Object.keys(statusMap).sort(); // keep deterministic order
    const statusOnline = statusArr.map(k => statusMap[k].online || 0);
    const statusOffline = statusArr.map(k => statusMap[k].offline || 0);
    if (statusChart) {
        statusChart.data.labels = statusArr;
        statusChart.data.datasets[0].data = statusOnline;
        statusChart.data.datasets[1].data = statusOffline;
        statusChart.update();
    }
    // Also update summary cards via existing UI function (if present)
    if (typeof updateStatusChartAndSummary === 'function') {
        try { updateStatusChartAndSummary(); } catch(e){ console.warn('updateStatusChartAndSummary failed', e); }
    }

    // 2) Region chart (Top5) - use current sort select
    const regionSort = DOMElements.regionChartSortSelect ? DOMElements.regionChartSortSelect.value : 'online_desc';
    updateRegionChart(false, regionSort);

    // 3) Province chart (Top5)
    const provinceSort = DOMElements.provinceChartSortSelect ? DOMElements.provinceChartSortSelect.value : 'online_desc';
    updateProvinceChart(false, provinceSort);

    // console.log("ตัวอย่าง branch record status:", source[0]);
}

// --- updateRegionChart: ถ้า isFullView = false -> top10 ใน container ปกติ, ถ้า true -> update modal fullChart ---
function updateRegionChart(isFullView = false, sortValue = 'online_desc') {
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;
    regionMap = getCountsByField(source, 'region');
    const top = sortAndSliceCounts(regionMap, sortValue, 5);

    if (!isFullView) {
        const labels = top.map(x => x.label);
        const onlineData = top.map(x => x.online);
        const offlineData = top.map(x => x.offline);
        
        // NEW: ทำลายกราฟเดิมก่อน เพื่อป้องกันปัญหาการแสดงผลผิดพลาด
        if (regionChart) {
            regionChart.destroy();
        }

        // NEW: สร้างกราฟใหม่ขึ้นมาเสมอ
        regionChart = new Chart(DOMElements.regionChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Online', data: onlineData, backgroundColor: 'rgba(34, 197, 94, 0.85)', borderColor: 'rgba(22,163,74,1)', borderWidth: 1 },
                    { label: 'Offline', data: offlineData, backgroundColor: 'rgba(220,38,38,0.85)', borderColor: 'rgba(185,28,28,1)', borderWidth: 1 }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'กราฟการเชื่อมต่อแยกตามภาค (Top 5)', font: { size: 14, weight: 'bold' } },
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed !== undefined ? context.parsed : context.raw} สาขา`;
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: false },
                    y: { stacked: false }
                },
                elements: { bar: { borderRadius: 6 } },
                animation: { duration: 600 }
            }
        });

        if (DOMElements.regionSummaryContainer) {
            // โค้ดสำหรับ update summary cards
            const html = top.map(t => {
                const rate = t.total > 0 ? ((t.online / t.total) * 100).toFixed(1) : 0;
                return `
                    <div class="summary-card">
                        <div class="summary-type"><span class="badge">📍</span> ${t.label}</div>
                        <div class="summary-stats">
                            <div class="summary-detail total"><div class="number">${t.total}</div><div class="label">ทั้งหมด</div></div>
                            <div class="summary-detail online"><div class="number">${t.online}</div><div class="label">Online</div></div>
                            <div class="summary-detail offline"><div class="number">${t.offline}</div><div class="label">Offline</div></div>
                            <div class="summary-detail rate"><div class="number">${rate}%</div><div class="label">Rate</div></div>
                        </div>
                    </div>`;
            }).join('');
            DOMElements.regionSummaryContainer.innerHTML = html || '<p style="text-align:center;color:#6b7280;">ไม่มีข้อมูล</p>';
        }
        return;
    } else {
        updateFullChart('region', sortValue, regionMap);
    }
}

// --- updateProvinceChart: เหมือน region แต่ใช้ field 'province' ---
function updateProvinceChart(isFullView = false, sortValue = 'online_desc') {
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;
    provinceMap = getCountsByField(source, 'province');
    const top = sortAndSliceCounts(provinceMap, sortValue, 5);
    
    if (!isFullView) {
        const labels = top.map(x => x.label);
        const onlineData = top.map(x => x.online);
        const offlineData = top.map(x => x.offline);
        
        // NEW: ทำลายกราฟเดิมก่อน เพื่อป้องกันปัญหาการวาดซ้อน
        if (provinceChart) {
            provinceChart.destroy();
        }

        // NEW: สร้างกราฟใหม่ขึ้นมาเสมอ
        provinceChart = new Chart(DOMElements.provinceChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Online', data: onlineData, backgroundColor: 'rgba(34, 197, 94, 0.85)', borderColor: 'rgba(22,163,74,1)', borderWidth: 1 },
                    { label: 'Offline', data: offlineData, backgroundColor: 'rgba(220,38,38,0.85)', borderColor: 'rgba(185,28,28,1)', borderWidth: 1 }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'กราฟการเชื่อมต่อแยกตามจังหวัด (Top 5)', font: { size: 14, weight: 'bold' } },
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed !== undefined ? context.parsed : context.raw} สาขา`;
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: false },
                    y: { stacked: false }
                },
                elements: { bar: { borderRadius: 6 } },
                animation: { duration: 600 }
            }
        });

        if (DOMElements.provinceSummaryContainer) {
            // โค้ดสำหรับ update summary cards
            const html = top.map(t => {
                const rate = t.total > 0 ? ((t.online / t.total) * 100).toFixed(1) : 0;
                return `
                    <div class="summary-card">
                        <div class="summary-type"><span class="badge">📍</span> ${t.label}</div>
                        <div class="summary-stats">
                            <div class="summary-detail total"><div class="number">${t.total}</div><div class="label">ทั้งหมด</div></div>
                            <div class="summary-detail online"><div class="number">${t.online}</div><div class="label">Online</div></div>
                            <div class="summary-detail offline"><div class="number">${t.offline}</div><div class="label">Offline</div></div>
                            <div class="summary-detail rate"><div class="number">${rate}%</div><div class="label">Rate</div></div>
                        </div>
                    </div>`;
            }).join('');
            DOMElements.provinceSummaryContainer.innerHTML = html || '<p style="text-align:center;color:#6b7280;">ไม่มีข้อมูล</p>';
        }
        return;
    } else {
        updateFullChart('province', sortValue, provinceMap);
    }
}

// --- updateFullChart: ใช้สำหรับ modal view (ทั้ง region/province) ---
function updateFullChart(chartType, sortDirection, dataMap) {
    const sortedData = sortAndSliceCounts(dataMap, sortDirection, null);
    const labels = sortedData.map(d => d.label);
    const onlineData = sortedData.map(d => d.online);
    const offlineData = sortedData.map(d => d.offline);
    const totalData = sortedData.map(d => d.total);

    const canvas = DOMElements.fullChartCanvas;
    if (!canvas) return;

    try { const old = Chart.getChart(canvas); if (old) old.destroy(); } catch(e){}
    
    // ตั้งค่าความสูงของ Canvas ตามจำนวนข้อมูลและประเภท chart
    let chartHeight;
    if (chartType === 'province') {
        const barHeight = 20;
        chartHeight = sortedData.length * barHeight;
        canvas.style.height = `${chartHeight}px`;
    } else {
        canvas.style.height = "400px";
    }


    const ctx = canvas.getContext('2d');
    fullChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Online', data: onlineData, backgroundColor: '#22c55e' },
                { label: 'Offline', data: offlineData, backgroundColor: '#dc2626' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // 🔹 ให้ทุก chart เป็น bar แนวนอน
            elements: { bar: { borderRadius: 6 } },
            scales: {
                x: { stacked: true },
                y: { stacked: true, ticks: { autoSkip: false } }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const total = totalData[context[0].dataIndex];
                            return `ทั้งหมด: ${total}`;
                        }
                    }
                }
            }
        },
    });


    // หลังจากวาดเสร็จ ให้บังคับ resize อีกครั้งเพื่อความแน่ใจ
    requestAnimationFrame(() => {
        if (fullChart) fullChart.resize();
    });

    // update summary cards
    const html = sortedData.map(t => {
        const rate = t.total > 0 ? ((t.online / t.total) * 100).toFixed(1) : 0;
        return `
            <div class="summary-card">
                <div class="summary-type"><span class="badge">📍</span> ${t.label}</div>
                <div class="summary-stats">
                    <div class="summary-detail total"><div class="number">${t.total}</div><div class="label">ทั้งหมด</div></div>
                    <div class="summary-detail online"><div class="number">${t.online}</div><div class="label">Online</div></div>
                    <div class="summary-detail offline"><div class="number">${t.offline}</div><div class="label">Offline</div></div>
                    <div class="summary-detail rate"><div class="number">${rate}%</div><div class="label">Rate</div></div>
                </div>
            </div>`;
    }).join('');
    DOMElements.fullChartSummaryContainer.innerHTML = html;
}

// --- เปิด modal แสดง full chart ---
// Replace existing openFullChartModal in app.js with this:
function openFullChartModal(chartType = 'region') {
    DOMElements.fullChartModal.dataset.chartType = chartType;
    DOMElements.fullChartModalTitle.textContent =
        chartType === 'province'
            ? 'สถานะการเชื่อมต่อแยกตาม "จังหวัด" ทั้งหมด'
            : 'สถานะการเชื่อมต่อแยกตาม "ภาค" ทั้งหมด';

    if (DOMElements.fullChartSortSelect) {
        DOMElements.fullChartSortSelect.value =
            (DOMElements[chartType + 'ChartSortSelect']?.value) || 'online_desc';
    }

    // 1) แสดง modal ก่อน
    DOMElements.fullChartModal.style.display = 'block';

    // 2) รอ modal render เสร็จแล้วค่อยสร้าง chart
    setTimeout(() => {
        const sortValue = DOMElements.fullChartSortSelect
            ? DOMElements.fullChartSortSelect.value
            : 'online_desc';

        if (chartType === 'region') {
            updateRegionChart(true, sortValue);
        } else {
            updateProvinceChart(true, sortValue);
        }

        // 3) บังคับ resize อีกครั้งให้แน่ใจ
        if (fullChart) {
            fullChart.resize();
            fullChart.update();
        }
    }, 100); // delay 100ms เพื่อให้ DOM layout เสร็จ
}

// --- ปิด modal full chart ---
function closeFullChartModal() {
    DOMElements.fullChartModal.style.display = 'none';
    try { if (fullChart) fullChart.destroy(); fullChart = null; } catch(e){ console.warn(e); }
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

window.addEventListener('DOMContentLoaded', () => {
    try { setupChart(); } catch(e) { console.warn('setupChart init error', e); }
    initializeApp();

    // --- listener สำหรับ dropdown ใน modal (เมื่อ user เปลี่ยนการ sort ให้ re-render) ---
    if (DOMElements.fullChartSortSelect) {
        DOMElements.fullChartSortSelect.addEventListener('change', () => {
            const chartType = DOMElements.fullChartModal.dataset.chartType || 'region';
            const map = chartType === 'region' ? getCountsByField(allBranches, 'region') : getCountsByField(allBranches, 'province');
            
            // เรียก updateFullChart() โดยตรง เมื่อมีการเปลี่ยนแปลงตัวเลือก
            updateFullChart(chartType, DOMElements.fullChartSortSelect.value, map);
        });
    }

    // --- เมื่อหน้าต่างถูก resize ขณะที่ modal เปิดอยู่ ให้รีไซส์ chart ด้วย ---
    window.addEventListener('resize', () => {
        if (DOMElements.fullChartModal && DOMElements.fullChartModal.style.display === 'block' && fullChart) {
            try { fullChart.resize(); } catch(e) { console.warn(e); }
        }
    });

});
