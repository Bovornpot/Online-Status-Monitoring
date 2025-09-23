// assets/scripts/dom.js

// REFACTORED: รวมการเข้าถึง DOM elements ไว้ที่เดียว
const DOMElements = {
    // Stats
    totalBranches: document.getElementById('totalBranches'),
    onlineBranches: document.getElementById('onlineBranches'),
    offlineBranches: document.getElementById('offlineBranches'),
    onlinePercentage: document.getElementById('onlinePercentage'),
    // Chart and Summary
    statusChartCanvas: document.getElementById('statusChart'),
    statusSummaryContainer: document.getElementById('statusSummaryContainer'),
    regionChartCanvas: document.getElementById('regionChart'),
    regionSummaryContainer: document.getElementById('regionSummaryContainer'),
    provinceChartCanvas: document.getElementById('provinceChart'),
    provinceSummaryContainer: document.getElementById('provinceSummaryContainer'),
    // สำหรับการจัดเรียง Chart ใน Tab 'ภาค' และ 'จังหวัด'
    regionChartSortSelect: document.getElementById('regionChartSortSelect'),
    provinceChartSortSelect: document.getElementById('provinceChartSortSelect'),
    // สำหรับปุ่ม View All
    viewAllRegionBtn: document.getElementById('viewAllRegionBtn'),
    viewAllProvinceBtn: document.getElementById('viewAllProvinceBtn'),
    // สำหรับ Full Chart Modal
    fullChartModal: document.getElementById('fullChartModal'),
    closeFullChartModalBtn: document.getElementById('closeFullChartModalBtn'),
    fullChartModalTitle: document.getElementById('fullChartModalTitle'),
    fullChartCanvas: document.getElementById('fullChartCanvas'),
    fullChartSummaryContainer: document.getElementById('fullChartSummaryContainer'),
    fullChartSortSelect: document.getElementById('fullChartSortSelect'),
    // Tab Elements
    tabLinks: document.querySelectorAll('.tab-link'),
    tabContents: document.querySelectorAll('.tab-content'), 
    tabStatusBtn: document.getElementById('tabStatusBtn'),
    tabRegionBtn: document.getElementById('tabRegionBtn'),
    tabProvinceBtn: document.getElementById('tabProvinceBtn'),
    statusTab: document.getElementById('statusChartTab'),
    regionTab: document.getElementById('regionChartTab'),
    provinceTab: document.getElementById('provinceChartTab'),
    // Controls
    addBranchBtn: document.getElementById('addBranchBtn'),
    fileInput: document.getElementById('fileInput'),
    exportExcelBtn: document.getElementById('exportExcelBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    clearDataBtn: document.getElementById('clearDataBtn'),
    // Filter
    searchInput: document.getElementById('searchInput'),
    provinceFilter: document.getElementById('provinceFilter'),
    statusFilter: document.getElementById('statusFilter'),
    regionFilter: document.getElementById('regionFilter'),
    branchStatusFilter: document.getElementById('branchStatusFilter'),
    recorderFilter: document.getElementById('recorderFilter'),
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

    // Elements ของ History Modal
    historyModal: document.getElementById('historyModal'),
    closeHistoryModalBtn: document.getElementById('closeHistoryModalBtn'),
    historyLogContainer: document.getElementById('historyLogContainer'),
    historyBtn: document.getElementById('historyBtn'),

    // Elements สำหรับจัดเรียงข้อมูล
    tableHeader: document.getElementById('tableHeader'), 
};

// ฟังก์ชันสำหรับแสดง Chart และ Summary ตาม Tab ที่เลือก

function showChartTab(tab) {
    // ซ่อนทุกแท็บ
    DOMElements.statusTab.style.display = 'none';
    DOMElements.regionTab.style.display = 'none';
    DOMElements.provinceTab.style.display = 'none';

    // ลบ class 'active' ออกจากทุกปุ่ม
    DOMElements.tabStatusBtn.classList.remove('active');
    DOMElements.tabRegionBtn.classList.remove('active');
    DOMElements.tabProvinceBtn.classList.remove('active');

    // แสดงแท็บที่เลือกและเพิ่ม class 'active'
    switch (tab) {
        case 'status':
            DOMElements.statusTab.style.display = 'block';
            DOMElements.tabStatusBtn.classList.add('active');
            // เพิ่มคำสั่งนี้เพื่อบังคับให้กราฟปรับขนาด
            if (statusChart) statusChart.resize(); 
            break;
        case 'region':
            DOMElements.regionTab.style.display = 'block';
            DOMElements.tabRegionBtn.classList.add('active');
            // เพิ่มคำสั่งนี้เพื่อบังคับให้กราฟปรับขนาด
            if (regionChart) regionChart.resize();
            break;
        case 'province':
            DOMElements.provinceTab.style.display = 'block';
            DOMElements.tabProvinceBtn.classList.add('active');
            // เพิ่มคำสั่งนี้เพื่อบังคับให้กราฟปรับขนาด
            if (provinceChart) provinceChart.resize();
            break;
    }
}
