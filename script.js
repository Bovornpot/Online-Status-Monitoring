// REFACTORED: จัดการฐานข้อมูลด้วย Dexie.js
const db = new Dexie('branchDB');
db.version(3).stores({
    branches: '++id, storeCode, branchName, province', // ++id คือ Auto-incrementing Primary Key
    meta: '&key', // ใช้ 'key' เป็น Primary Key ที่ไม่ซ้ำกัน
    activityLog: '++id, timestamp'
});

// REFACTORED: รวมการเข้าถึง DOM elements ไว้ที่เดียว
const DOMElements = {
    // Stats
    totalBranches: document.getElementById('totalBranches'),
    onlineBranches: document.getElementById('onlineBranches'),
    offlineBranches: document.getElementById('offlineBranches'),
    onlinePercentage: document.getElementById('onlinePercentage'),
    // Controls
    searchInput: document.getElementById('searchInput'),
    provinceFilter: document.getElementById('provinceFilter'),
    statusFilter: document.getElementById('statusFilter'),
    addBranchBtn: document.getElementById('addBranchBtn'),
    fileInput: document.getElementById('fileInput'),
    exportExcelBtn: document.getElementById('exportExcelBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    clearDataBtn: document.getElementById('clearDataBtn'),
    // Table
    branchTableBody: document.getElementById('branchTableBody'),
    // Pagination
    paginationContainer: document.getElementById('paginationContainer'),
    paginationInfo: document.getElementById('paginationInfo'),
    currentPageInfo: document.getElementById('currentPageInfo'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    firstPageBtn: document.getElementById('firstPageBtn'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    lastPageBtn: document.getElementById('lastPageBtn'),
    // Modal
    modal: document.getElementById('branchModal'),
    modalTitle: document.getElementById('modalTitle'),
    branchForm: document.getElementById('branchForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    editingId: document.getElementById('editingId'),
    //Element สำหรับ data source
    dataSourceInfo: document.getElementById('dataSourceInfo'),

    // Elements ของ Details Modal
    detailsModal: document.getElementById('detailsModal'),
    closeDetailsModalBtn: document.getElementById('closeDetailsModalBtn'),
    detailsModalTitle: document.getElementById('detailsModalTitle'),
    detailsModalBody: document.getElementById('detailsModalBody'),
    detailsModalEditBtn: document.getElementById('detailsModalEditBtn'),
    detailsModalDeleteBtn: document.getElementById('detailsModalDeleteBtn'),

    // Elements ของ Export Modal
    exportModal: document.getElementById('exportModal'),
    closeExportModalBtn: document.getElementById('closeExportModalBtn'),
    cancelExportModalBtn: document.getElementById('cancelExportModalBtn'),
    exportForm: document.getElementById('exportForm'),
    exportFileName: document.getElementById('exportFileName'),

    notificationModal: document.getElementById('notificationModal'),
    notificationIcon: document.getElementById('notificationIcon'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationMessage: document.getElementById('notificationMessage'),
    notificationActions: document.getElementById('notificationActions'),

    // NEW: Elements ของ History Modal
    historyModal: document.getElementById('historyModal'),
    closeHistoryModalBtn: document.getElementById('closeHistoryModalBtn'),
    historyLogContainer: document.getElementById('historyLogContainer'),
    historyBtn: document.getElementById('historyBtn'),
};

// State Management
let allBranches = []; // ข้อมูลทั้งหมดจาก DB
let filteredBranches = []; // ข้อมูลที่ผ่านการกรอง
let currentPage = 1;
let pageSize = 100;
let currentDataSource = { name: "ยังไม่มีข้อมูล", status: "" };
let exportType = null; // ตัวแปรสำหรับจำประเภทไฟล์ที่จะ Export ('excel' หรือ 'csv')
let branchBeforeEdit = null; // NEW: ตัวแปรสำหรับเก็บข้อมูลสาขาก่อนที่จะถูกแก้ไข

// NEW: ฟังก์ชันเริ่มต้นการทำงานของแอปพลิเคชัน
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

    await loadDataFromDB();
}

// NEW: โหลดข้อมูลจาก IndexedDB
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

// NEW: ฟังก์ชันสำหรับอัปเดตข้อมูลแหล่งที่มา ทั้งใน UI และ DB
async function updateDataSource(name, status) {
    const timestamp = new Date();
    currentDataSource = { name, status, timestamp };
    
    // บันทึกข้อมูลลง DB
    await db.meta.put({ key: 'dataSource', value: currentDataSource });

    // อัปเดตการแสดงผล
    displayDataSource();
}

// NEW: ฟังก์ชันสำหรับแสดงผลข้อมูลแหล่งที่มาบนหน้าจอ
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
// NEW: ฟังก์ชันสำหรับเปิดและแสดงข้อมูลใน Details Modal
async function openDetailsModal(id) {
    const branch = await db.branches.get(id);
    if (!branch) {
        await showNotification({ type: 'error', title: 'ผิดพลาด', message: 'ไม่พบข้อมูลสาขา' });
        return;
    }

    // สร้าง Label ที่จะแสดงผลให้สวยงาม
    const fieldLabels = {
        storeCode: 'รหัสร้าน', branchName: 'ชื่อสาขา', region: 'ภาค',
        status: 'สถานะ', allZone: 'All Zone', onlineStatus: 'สถานะเชื่อมOnline',
        district: 'อำเภอ', province: 'จังหวัด', shopType: 'Shophouse/Standalone',
        fc: 'FC.', zone: 'เขต', department: 'ฝ่าย',
        gm: 'GM.', avp: 'AVP'
    };

    let detailsHtml = '<div class="details-grid">';
    for (const key in fieldLabels) {
        detailsHtml += `
            <div class="details-label">${fieldLabels[key]}:</div>
            <div class="details-value">${branch[key] || '-'}</div>
        `;
    }
    detailsHtml += '</div>';

    DOMElements.detailsModalBody.innerHTML = detailsHtml;
    
    // เก็บ id ของสาขาไว้กับ Modal เพื่อให้ปุ่ม แก้ไข/ลบ รู้ว่าต้องทำงานกับใคร
    DOMElements.detailsModal.dataset.branchId = id;
    
    DOMElements.detailsModal.style.display = 'block';
}

// NEW: ฟังก์ชันสำหรับปิด Details Modal
function closeDetailsModal() {
    DOMElements.detailsModal.style.display = 'none';
    DOMElements.detailsModal.dataset.branchId = ''; // ล้าง id ที่เก็บไว้ออก
}

// NEW: ฟังก์ชันสำหรับเปิด Export Modal
function openExportModal(type) {
    exportType = type; // 'excel' หรือ 'csv'
    
    // สร้างชื่อไฟล์เริ่มต้น พร้อมวันที่ปัจจุบัน
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    DOMElements.exportFileName.value = `branch_data_${date}`;
    
    DOMElements.exportModal.style.display = 'block';
    DOMElements.exportFileName.focus(); // ให้ Cursor ไปอยู่ที่ช่องกรอกชื่ออัตโนมัติ
}

// NEW: ฟังก์ชันสำหรับปิด Export Modal
function closeExportModal() {
    DOMElements.exportModal.style.display = 'none';
    exportType = null; // รีเซ็ตค่า
    DOMElements.exportForm.reset(); // ล้างค่าในฟอร์ม
}

// NEW: ฟังก์ชันสำหรับซ่อน Notification Modal
function hideNotification() {
    DOMElements.notificationModal.style.display = 'none';
}

// NEW: ฟังก์ชันอัจฉริยะสำหรับแสดง Notification Modal ในสถานะต่างๆ
function showNotification({ type, title, message }) {
    return new Promise((resolve) => {
        const { notificationIcon, notificationTitle, notificationMessage, notificationActions, notificationModal } = DOMElements;

        // Reset สถานะเริ่มต้น
        notificationIcon.innerHTML = '';
        notificationActions.innerHTML = '';
        notificationIcon.className = 'notification-icon';

        notificationTitle.textContent = title;
        notificationMessage.innerHTML = message.replace(/\n/g, '<br>'); // รองรับการขึ้นบรรทัดใหม่

        // สร้างปุ่มตามประเภท
        switch (type) {
            case 'loading':
                notificationIcon.classList.add('loading');
                notificationIcon.innerHTML = '<div class="loader"></div>';
                // ไม่มีปุ่มสำหรับ Loading
                break;
            
            case 'success':
                notificationIcon.classList.add('success');
                notificationIcon.innerHTML = '✔️';
                const okButtonSuccess = document.createElement('button');
                okButtonSuccess.textContent = 'ตกลง';
                okButtonSuccess.onclick = () => {
                    hideNotification();
                    resolve(true);
                };
                notificationActions.appendChild(okButtonSuccess);
                break;

            case 'error':
                notificationIcon.classList.add('error');
                notificationIcon.innerHTML = '❌';
                const okButtonError = document.createElement('button');
                okButtonError.textContent = 'ตกลง';
                okButtonError.onclick = () => {
                    hideNotification();
                    resolve(true); // resolve(true) เพราะผู้ใช้แค่กดรับทราบ
                };
                notificationActions.appendChild(okButtonError);
                break;

            case 'confirm':
                notificationIcon.classList.add('confirm');
                notificationIcon.innerHTML = '❓';
                
                const confirmButton = document.createElement('button');
                confirmButton.textContent = 'ยืนยัน';
                confirmButton.className = 'btn-confirm';
                confirmButton.onclick = () => {
                    hideNotification();
                    resolve(true); // ผู้ใช้กดยืนยัน
                };

                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'ยกเลิก';
                cancelButton.className = 'btn-cancel';
                cancelButton.onclick = () => {
                    hideNotification();
                    resolve(false); // ผู้ใช้กดยกเลิก
                };
                
                notificationActions.appendChild(cancelButton);
                notificationActions.appendChild(confirmButton);
                break;
        }

        notificationModal.style.display = 'block';
    });
}

// ฟังก์ชันสำหรับบันทึกกิจกรรมลง DB
async function logActivity(action, details) {
    try {
        await db.activityLog.add({
            timestamp: new Date(),
            action: action,
            details: details
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// ฟังก์ชันสำหรับเปิดหน้าต่างประวัติ
async function openHistoryModal() {
    DOMElements.historyLogContainer.innerHTML = '<p>กำลังโหลดประวัติ...</p>';
    DOMElements.historyModal.style.display = 'block';

    const logs = await db.activityLog.orderBy('timestamp').reverse().toArray();

    if (logs.length === 0) {
        DOMElements.historyLogContainer.innerHTML = '<p>ยังไม่มีประวัติการใช้งาน</p>';
        return;
    }

    const logHtml = logs.map(log => {
        const timestamp = log.timestamp.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' });
        const actionClass = log.action.toLowerCase().replace(' ', '_');
        return `
            <div class="log-entry">
                <div class="log-timestamp">${timestamp}</div>
                <div class="log-action ${actionClass}">${log.action}</div>
                <div class="log-details">${log.details.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    }).join('');

    DOMElements.historyLogContainer.innerHTML = logHtml;
}

// ฟังก์ชันสำหรับปิดหน้าต่างประวัติ
function closeHistoryModal() {
    DOMElements.historyModal.style.display = 'none';
}

// REFACTORED: รวมการตั้งค่า Event Listener ไว้ในฟังก์ชันเดียว
function setupEventListeners() {
    // Filters
    DOMElements.searchInput.addEventListener('keyup', debounce(applyFilters, 300));
    DOMElements.provinceFilter.addEventListener('change', applyFilters);
    DOMElements.statusFilter.addEventListener('change', applyFilters);

    // Buttons
    DOMElements.addBranchBtn.addEventListener('click', openAddModal);
    DOMElements.exportExcelBtn.addEventListener('click', () => openExportModal('excel'));
    DOMElements.exportCsvBtn.addEventListener('click', () => openExportModal('csv'));
    DOMElements.clearDataBtn.addEventListener('click', confirmClearAllData);
    DOMElements.historyBtn.addEventListener('click', openHistoryModal);
    DOMElements.closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
    DOMElements.fileInput.addEventListener('change', handleFileUpload);
    
    // Pagination
    DOMElements.pageSizeSelect.addEventListener('change', changePageSize);
    DOMElements.firstPageBtn.addEventListener('click', () => goToPage(1));
    DOMElements.prevPageBtn.addEventListener('click', goToPreviousPage);
    DOMElements.nextPageBtn.addEventListener('click', goToNextPage);
    DOMElements.lastPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBranches.length / pageSize);
        goToPage(totalPages);
    });

    // Modal
    DOMElements.branchForm.addEventListener('submit', saveBranch);
    DOMElements.closeModalBtn.addEventListener('click', closeModal);
    DOMElements.cancelModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === DOMElements.modal) closeModal();
        if (event.target === DOMElements.detailsModal) closeDetailsModal();
        if (event.target === DOMElements.exportModal) closeExportModal();
        if (event.target === DOMElements.notificationModal) hideNotification();
        if (event.target === DOMElements.historyModal) closeHistoryModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
            closeDetailsModal();
            closeExportModal();
            hideNotification();
            closeHistoryModal();
        }
    });

    // NEW: Event Listener สำหรับ Export Modal
    DOMElements.closeExportModalBtn.addEventListener('click', closeExportModal);
    DOMElements.cancelExportModalBtn.addEventListener('click', closeExportModal);

    DOMElements.exportForm.addEventListener('submit', (event) => {
        event.preventDefault(); // ป้องกันหน้าเว็บรีโหลด
        const fileName = DOMElements.exportFileName.value.trim();

        if (fileName) {
            if (exportType === 'excel') {
                exportExcel(fileName);
            } else if (exportType === 'csv') {
                exportCSV(fileName);
            }
            closeExportModal();
        } else {
            showNotification({ type: 'error', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกชื่อไฟล์ก่อนทำการส่งออก' });
        }
    });

    // NEW: Event Listener สำหรับ Details Modal
    DOMElements.closeDetailsModalBtn.addEventListener('click', closeDetailsModal);

    DOMElements.detailsModalEditBtn.addEventListener('click', () => {
        const branchId = parseInt(DOMElements.detailsModal.dataset.branchId);
        if (branchId) {
            closeDetailsModal(); // ปิด Modal รายละเอียดก่อน
            editBranch(branchId); // แล้วเปิด Modal แก้ไข
        }
    });

    DOMElements.detailsModalDeleteBtn.addEventListener('click', () => {
        const branchId = parseInt(DOMElements.detailsModal.dataset.branchId);
        if (branchId) {
            closeDetailsModal();
            confirmDeleteBranch(branchId);
        }
    });

    // NEW: Event Delegation สำหรับปุ่ม "จัดการ" ในตาราง
    // วิธีนี้ทำให้เราไม่ต้องผูก Event ให้ทุกปุ่ม แต่ดักฟังที่ตัวแม่ (tbody) ทีเดียว
    DOMElements.branchTableBody.addEventListener('click', (event) => {
        const manageButton = event.target.closest('.btn-manage');
        if (manageButton) {
            const branchId = parseInt(manageButton.dataset.id);
            openDetailsModal(branchId);
        }
    });
}


// REFACTORED: ฟังก์ชันกรองข้อมูล
function applyFilters() {
    const searchTerm = DOMElements.searchInput.value.toLowerCase();
    const provinceFilter = DOMElements.provinceFilter.value;
    const statusFilter = DOMElements.statusFilter.value;

    filteredBranches = allBranches.filter(branch => {
        const matchesSearch = !searchTerm ||
            Object.values(branch).some(val => 
                String(val).toLowerCase().includes(searchTerm)
            );
        const matchesProvince = !provinceFilter || branch.province === provinceFilter;
        const matchesStatus = !statusFilter ||
            (statusFilter === 'online' && branch.onlineStatus === 'สามารถเชื่อม Online') ||
            (statusFilter === 'offline' && branch.onlineStatus !== 'สามารถเชื่อม Online');
        return matchesSearch && matchesProvince && matchesStatus;
    });

    currentPage = 1;
    refreshUI(); // REFACTORED: เรียกฟังก์ชันเดียวเพื่ออัพเดท UI ทั้งหมด
}

// NEW: ฟังก์ชันกลางสำหรับอัพเดท UI ทั้งหมด
function refreshUI() {
    updateTable();
    updatePagination();
    updateStats();
    updateProvinceFilter();
}


function updateTable() {
    if (allBranches.length === 0) {
        showEmptyMessage("ยังไม่มีข้อมูล - กรุณา Import ไฟล์ข้อมูลสาขา");
        DOMElements.paginationContainer.style.display = 'none';
        return;
    }

    if (filteredBranches.length === 0) {
        showEmptyMessage("ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา");
        DOMElements.paginationContainer.style.display = 'none';
        return;
    }
    
    DOMElements.paginationContainer.style.display = 'flex';
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredBranches.length);
    const pageData = filteredBranches.slice(startIndex, endIndex);
    const searchTerm = DOMElements.searchInput.value.toLowerCase();

    const tableRows = pageData.map(branch => {
        let statusDisplayHtml;
        switch (branch.onlineStatus) {
            case 'สามารถเชื่อม Online':
                statusDisplayHtml = '<span class="status-online">🟢 Online</span>';
                break;
            case 'ไม่สามารถเชื่อม Online':
                statusDisplayHtml = '<span class="status-offline">🔴 Offline</span>';
                break;
            case 'ร้านไม่ติดกล้อง CCTV':
                statusDisplayHtml = '<span class="status-cctv">🟠 No CCTV</span>';
                break;
            default:
                // กรณีข้อมูลไม่ตรงกับที่คาดไว้ ให้แสดงเป็น Offline
                statusDisplayHtml = '<span class="status-offline">🔴 Offline</span>';
        }

        return `
            <tr data-id="${branch.id}">
                <td>${highlightText(branch.storeCode, searchTerm)}</td>
                <td>${highlightText(branch.branchName, searchTerm)}</td>
                <td>${branch.region || ''}</td>
                <td>${branch.status || '-'}</td>
                <td>${branch.allZone || ''}</td>
                <td>${statusDisplayHtml}</td>
                <td>${highlightText(branch.district, searchTerm)}</td>
                <td>${highlightText(branch.province, searchTerm)}</td>
                <td>${branch.shopType || '-'}</td>
                <td>
                    <button class="btn-manage" data-id="${branch.id}">⚙️ จัดการ</button>
                </td>
            </tr>
        `;
    }).join('');

    DOMElements.branchTableBody.innerHTML = tableRows;
}


// REFACTORED: ฟังก์ชัน Pagination
function updatePagination() {
    const totalItems = filteredBranches.length;
    if (totalItems === 0) return;

    const totalPages = Math.ceil(totalItems / pageSize);
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    DOMElements.paginationInfo.textContent = `แสดง ${startItem} - ${endItem} จาก ${totalItems} รายการ`;
    DOMElements.currentPageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages}`;

    DOMElements.firstPageBtn.disabled = currentPage === 1;
    DOMElements.prevPageBtn.disabled = currentPage === 1;
    DOMElements.nextPageBtn.disabled = currentPage === totalPages;
    DOMElements.lastPageBtn.disabled = currentPage === totalPages;
}

function changePageSize() {
    pageSize = parseInt(DOMElements.pageSizeSelect.value);
    currentPage = 1;
    updateTable();
    updatePagination();
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredBranches.length / pageSize);
    currentPage = Math.max(1, Math.min(page, totalPages));
    updateTable();
    updatePagination();
}

function goToPreviousPage() { if (currentPage > 1) goToPage(currentPage - 1); }
function goToNextPage() { 
    const totalPages = Math.ceil(filteredBranches.length / pageSize);
    if (currentPage < totalPages) goToPage(currentPage + 1);
}

// REFACTORED: อัพเดทข้อมูลสถิติ
function updateStats() {
    const total = allBranches.length;
    const online = allBranches.filter(b => b.onlineStatus === 'สามารถเชื่อม Online').length;
    const offline = total - online;
    const percentage = total > 0 ? Math.round((online / total) * 100) : 0;

    DOMElements.totalBranches.textContent = total;
    DOMElements.onlineBranches.textContent = online;
    DOMElements.offlineBranches.textContent = offline;
    DOMElements.onlinePercentage.textContent = `${percentage}%`;
}

// REFACTORED: อัพเดทตัวกรองจังหวัด
function updateProvinceFilter() {
    const provinces = [...new Set(allBranches.map(b => b.province).filter(p => p))].sort();
    const currentValue = DOMElements.provinceFilter.value;
    
    DOMElements.provinceFilter.innerHTML = '<option value="">ทุกจังหวัด</option>' + 
        provinces.map(p => `<option value="${p}">${p}</option>`).join('');
        
    // รักษาค่าเดิมที่เลือกไว้
    if (provinces.includes(currentValue)) {
        DOMElements.provinceFilter.value = currentValue;
    }
}


// REFACTORED: Modal functions
function openAddModal() {
    DOMElements.modalTitle.textContent = 'เพิ่มสาขาใหม่';
    DOMElements.branchForm.reset();
    DOMElements.editingId.value = '';
    DOMElements.modal.style.display = 'block';
    document.getElementById('storeCode').focus();
}

async function editBranch(id) {
    const branch = await db.branches.get(id);
    if (!branch) return;
    branchBeforeEdit = branch; // [NEW] จำข้อมูลปัจจุบันไว้ก่อน

    DOMElements.modalTitle.textContent = 'แก้ไขข้อมูลสาขา';
    DOMElements.branchForm.reset();
    
    // REFACTORED: ใช้ loop ในการกรอกข้อมูล
    for (const key in branch) {
        if (DOMElements.branchForm.elements[key]) {
            DOMElements.branchForm.elements[key].value = branch[key] || '';
        }
    }
    DOMElements.editingId.value = branch.id;
    
    DOMElements.modal.style.display = 'block';
}

function closeModal() {
    DOMElements.modal.style.display = 'none';
}

// REFACTORED: บันทึกข้อมูล (เพิ่ม/แก้ไข)
async function saveBranch(event) {
    event.preventDefault();
    const formData = new FormData(DOMElements.branchForm);
    const branchData = Object.fromEntries(formData.entries());
    const editingId = parseInt(DOMElements.editingId.value);

    const existing = await db.branches.where('storeCode').equals(branchData.storeCode).first();
    if (existing && existing.id !== editingId) {
        await showNotification({ type: 'error', title: 'ข้อมูลซ้ำซ้อน', message: 'รหัสร้านนี้มีอยู่แล้ว' });
        return;
    }
    try {
        if (editingId && branchBeforeEdit) { // ตรวจสอบว่าเป็นการแก้ไขและมีข้อมูลเก่าให้เทียบ
            delete branchData.id;
            
            // [NEW] ส่วนเปรียบเทียบข้อมูลเพื่อสร้าง Log
            const fieldLabels = { storeCode: 'รหัสร้าน', branchName: 'ชื่อสาขา', region: 'ภาค', status: 'สถานะ', allZone: 'All Zone', onlineStatus: 'สถานะเชื่อมOnline', district: 'อำเภอ', province: 'จังหวัด', shopType: 'Shophouse/Standalone', fc: 'FC.', zone: 'เขต', department: 'ฝ่าย', gm: 'GM.', avp: 'AVP' };
            const changes = [];
            for (const key in branchData) {
                // เปรียบเทียบค่าเก่ากับค่าใหม่
                if (branchData[key] !== branchBeforeEdit[key]) {
                    const label = fieldLabels[key] || key;
                    changes.push(`- ${label}: เปลี่ยนจาก "${branchBeforeEdit[key] || '(ว่าง)'}" เป็น "${branchData[key] || '(ว่าง)'}"`);
                }
            }

            await db.branches.update(editingId, branchData);
            await showNotification({ type: 'success', title: 'สำเร็จ', message: 'แก้ไขข้อมูลสาขาเรียบร้อยแล้ว' });

            if (changes.length > 0) {
                const logDetails = `แก้ไขข้อมูลสาขา: ${branchData.storeCode} - ${branchData.branchName}\n${changes.join('\n')}`;
                await logActivity('EDIT', logDetails);
            }

        } else { // กรณีเป็นการเพิ่มข้อมูลใหม่
            await db.branches.add(branchData);
            await showNotification({ type: 'success', title: 'สำเร็จ', message: 'เพิ่มข้อมูลสาขาเรียบร้อยแล้ว' });
            await logActivity('ADD', `เพิ่มสาขาใหม่: ${branchData.storeCode} - ${branchData.branchName}`);
        }
        
        closeModal();
        branchBeforeEdit = null; // ล้างข้อมูลเก่าที่จำไว้
        await updateDataSource(currentDataSource.name, 'modified');
        await loadDataFromDB();
    } catch (error) {
        console.error("Failed to save branch:", error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถบันทึกข้อมูลได้' });
    }
}

// NEW: ฟังก์ชันยืนยันการลบ
async function confirmDeleteBranch(id) {
    const branch = allBranches.find(b => b.id === id);
    if (branch) {
        const confirmed = await showNotification({
            type: 'confirm',
            title: 'ยืนยันการลบ',
            message: `คุณต้องการลบสาขา "${branch.branchName || branch.storeCode}" ใช่หรือไม่?`
        });
        if (confirmed) {
            deleteBranch(id, branch); // ส่งข้อมูล branch ไปด้วยเพื่อใช้ log
        }
    }
}

async function deleteBranch(id, branchInfo) { // รับ branchInfo เพิ่ม
    try {
        await db.branches.delete(id);
        await showNotification({ type: 'success', title: 'สำเร็จ', message: 'ลบข้อมูลสาขาเรียบร้อยแล้ว' });
        await logActivity('DELETE', `ลบสาขา: ${branchInfo.storeCode} - ${branchInfo.branchName}`);
        await updateDataSource(currentDataSource.name, 'modified');
        await loadDataFromDB();
    } catch (error) {
        console.error("Failed to delete branch:", error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถลบข้อมูลได้' });
    }
}

async function confirmClearAllData() {
    const confirmed = await showNotification({
        type: 'confirm',
        title: 'ยืนยันการล้างข้อมูล',
        message: 'คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้'
    });
    if (confirmed) {
        clearAllData();
    }
}

async function clearAllData() {
    try {
        await db.branches.clear();
        await showNotification({ type: 'success', title: 'สำเร็จ', message: 'ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว' });;

        await updateDataSource('ยังไม่มีข้อมูล', '');
        allBranches = [];
        applyFilters();
    } catch (error) {
        console.error("Failed to clear data:", error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถล้างข้อมูลได้' });
    }
}

// REFACTORED: การจัดการไฟล์ Upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoadingMessage("กำลังอ่านและประมวลผลไฟล์...");

    try {
        const data = await parseFile(file);
        if (data.length === 0) {
            await showNotification({ type: 'error', title: 'ไฟล์ข้อมูลไม่ถูกต้อง', message: 'ไม่พบแถวข้อมูลในไฟล์ (ต้องมีอย่างน้อย 1 แถวข้อมูลใต้ Header)' });
            refreshUI();
            return;
        }

        const { newBranches, skippedCount } = processData(data);
        
        await db.transaction('rw', db.branches, async () => {
            await db.branches.clear();
            await db.branches.bulkAdd(newBranches);
        });

        await updateDataSource(file.name, 'loaded');
        await logActivity('IMPORT', `นำเข้าข้อมูลจากไฟล์ ${file.name} จำนวน ${newBranches.length} รายการ`);
        await showNotification({ type: 'success', title: 'นำเข้าสำเร็จ', message: `นำเข้าข้อมูลใหม่: ${newBranches.length} รายการ\nข้ามแถวข้อมูลที่ไม่สมบูรณ์/ว่าง: ${skippedCount} รายการ` });
        await loadDataFromDB();

    } catch (error) {
        console.error('Error handling file upload:', error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถอ่านหรือประมวลผลไฟล์ได้\nกรุณาตรวจสอบรูปแบบไฟล์' });
        refreshUI();
    } finally {
        event.target.value = ''; // รีเซ็ต input file
    }
}

function parseFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const content = e.target.result;
                if (file.name.toLowerCase().endsWith('.csv')) {
                    const workbook = XLSX.read(content, {type: 'string'});
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval:'' }));
                } else { // xls, xlsx
                    const workbook = XLSX.read(content, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval:'' }));
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        if (file.name.toLowerCase().endsWith('.csv')) {
             reader.readAsText(file, 'UTF-8');
        } else {
             reader.readAsArrayBuffer(file);
        }
    });
}

function processData(data) {
    const headers = data[0].map(h => String(h).trim());
    const columnMapping = getColumnMapping();
    
    // [NEW] สร้าง Map เพื่อปรับมาตรฐานข้อมูลสำหรับ Dropdown
    const regionMap = {
        "be": "BE", "bg": "BG", "bn": "BN", "bs": "BS", "bw": "BW", "cm": "CM",
        "nel": "NEL", "neu": "NEU", "pk": "PK", "rc": "RC", "rel": "REL",
        "reu": "REU", "rn": "RN", "rsl": "RSL", "rsu": "RSU", "ub": "UB", "yl": "YL"
    };

    const statusMap = { 
        "co": "CO", 
        "SBP": "SBP",
        "sub-area": "Sub-Area", 
        "ปตท": "ปตท",

    };
    const allZoneMap = { 
        "bangkok": "Bangkok", 
        "region": "Region", 
        "sub-area": "Sub-Area"
    };
    const shopTypeMap = { 
        "shophouse": "Shophouse", "standalone": "Standalone", 
        "pb": "PB", "sa": "SA", "sh": "SH"
    };

    let skippedCount = 0;
    const newBranches = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0 || !row.some(cell => cell && String(cell).trim())) {
            skippedCount++;
            continue;
        }
        const newBranch = {};
        headers.forEach((header, index) => {
            const mappedField = columnMapping[header];
            if (mappedField && row[index] !== undefined && row[index] !== null) {
                newBranch[mappedField] = String(row[index]).trim();
            }
        });

        // [NEW] ทำการ Normalize ข้อมูลที่อาจเพี้ยน
        if (newBranch.region) {
            newBranch.region = regionMap[newBranch.region.toLowerCase()] || newBranch.region;
        }
        if (newBranch.status) {
            newBranch.status = statusMap[newBranch.status.toLowerCase()] || newBranch.status;
        }
        if (newBranch.allZone) {
            newBranch.allZone = allZoneMap[newBranch.allZone.toLowerCase()] || newBranch.allZone;
        }
        if (newBranch.shopType) {
            newBranch.shopType = shopTypeMap[newBranch.shopType.toLowerCase()] || newBranch.shopType;
        }


        if (newBranch.onlineStatus) {
            const status = newBranch.onlineStatus.toLowerCase().trim();
            if (status.includes('ไม่สามารถ')) {
                newBranch.onlineStatus = 'ไม่สามารถเชื่อม Online';
            } else if (status.includes('cctv') || status.includes('ไม่ติดกล้อง')) {
                newBranch.onlineStatus = 'ร้านไม่ติดกล้อง CCTV';
            } else if (status.includes('สามารถ') || status === 'online' || status === '1' || status === 'true') {
                newBranch.onlineStatus = 'สามารถเชื่อม Online';
            } else {
                newBranch.onlineStatus = 'ไม่สามารถเชื่อม Online';
            }
        } else {
            newBranch.onlineStatus = 'ไม่สามารถเชื่อม Online';
        }
        
        if (newBranch.storeCode) {
            newBranches.push(newBranch);
        } else {
            skippedCount++;
        }
    }
    return { newBranches, skippedCount };
}


function getColumnMapping() {
    return {
        'รหัสร้าน': 'storeCode', 'รหัส': 'storeCode', 'Store Code': 'storeCode', 'Code': 'storeCode',
        'ชื่อสาขา': 'branchName', 'สาขา': 'branchName', 'Branch Name': 'branchName', 'Branch': 'branchName',
        'ภาค': 'region', 'Region': 'region',
        'สถานะ': 'status', 'Status': 'status',
        'All Zone': 'allZone', 'allzone': 'allZone',
        'สถานะเชื่อมOnline': 'onlineStatus', 'Online Status': 'onlineStatus', 'Online': 'onlineStatus',
        'อำเภอ': 'district', 'District': 'district',
        'จังหวัด': 'province', 'Province': 'province',
        'FC.': 'fc', 'FC': 'fc',
        'เขต': 'zone', 'Zone': 'zone',
        'ฝ่าย': 'department', 'Department': 'department',
        'GM.': 'gm', 'GM': 'gm',
        'AVP': 'avp',
        'Shophouse/Standalone': 'shopType', 'Shop Type': 'shopType', 'Type': 'shopType'
    };
}

// REFACTORED: Export functions
function exportExcel(fileName) {
    if (allBranches.length === 0) {
        showNotification({ type: 'error', title: 'ไม่มีข้อมูล', message: 'ไม่มีข้อมูลสำหรับส่งออก' });
        return;
    }
    const headers = ['รหัสร้าน', 'ชื่อสาขา', 'ภาค', 'สถานะ', 'All Zone', 'สถานะเชื่อมOnline', 'อำเภอ', 'จังหวัด', 'FC.', 'เขต', 'ฝ่าย', 'GM.', 'AVP', 'Shophouse/Standalone'];
    const dataToExport = allBranches.map(b => [
        b.storeCode, b.branchName, b.region, b.status, b.allZone, b.onlineStatus,
        b.district, b.province, b.fc, b.zone, b.department, b.gm, b.avp, b.shopType
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    worksheet['!cols'] = headers.map(() => ({ wch: 20 })); // ตั้งค่าความกว้างคอลัมน์
    const workbook = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Branch Data');
    logActivity('EXPORT EXCEL', `ส่งออกข้อมูลเป็น Excel ชื่อไฟล์ ${fileName}.xlsx`);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

function exportCSV(fileName) {
    if (allBranches.length === 0) {
        showNotification({ type: 'error', title: 'ไม่มีข้อมูล', message: 'ไม่มีข้อมูลสำหรับส่งออก' });
        return;
    }
    const headers = ['รหัสร้าน', 'ชื่อสาขา', 'ภาค', 'สถานะ', 'All Zone', 'สถานะเชื่อมOnline', 'อำเภอ', 'จังหวัด', 'FC.', 'เขต', 'ฝ่าย', 'GM.', 'AVP', 'Shophouse/Standalone'];
    const dataToExport = allBranches.map(b => [
        b.storeCode, b.branchName, b.region, b.status, b.allZone, b.onlineStatus,
        b.district, b.province, b.fc, b.zone, b.department, b.gm, b.avp, b.shopType
    ]);
    
    let csvContent = headers.join(',') + '\n';
    dataToExport.forEach(row => {
        csvContent += row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    logActivity('EXPORT CSV', `ส่งออกข้อมูลเป็น CSV ชื่อไฟล์ ${fileName}.csv`);
    link.click();
    URL.revokeObjectURL(link.href);
}

// Utility functions
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return String(text).replace(regex, '<span class="search-highlight">$1</span>');
}

function showLoadingMessage(message) {
    DOMElements.branchTableBody.innerHTML = `<tr><td colspan="15" class="loading">${message}</td></tr>`;
}

function showEmptyMessage(message) {
    DOMElements.branchTableBody.innerHTML = `<tr><td colspan="15" class="no-data">${message}</td></tr>`;
}

// Debounce function to prevent filter from running on every keystroke
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}


// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);