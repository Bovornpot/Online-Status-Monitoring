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

    // NEW: Elements ของ History Modal
    historyModal: document.getElementById('historyModal'),
    closeHistoryModalBtn: document.getElementById('closeHistoryModalBtn'),
    historyLogContainer: document.getElementById('historyLogContainer'),
    historyBtn: document.getElementById('historyBtn'),

    // NEW: Elements สำหรับจัดเรียงข้อมูล
    branchTableBody: document.getElementById('branchTableBody'),
    tableHeader: document.getElementById('tableHeader'), 
};
