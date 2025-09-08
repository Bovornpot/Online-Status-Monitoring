// assets/scripts/events.js

// REFACTORED: รวมการตั้งค่า Event Listener ไว้ในฟังก์ชันเดียว
function setupEventListeners() {
    // Filters
    DOMElements.searchInput.addEventListener('keyup', debounce(applyFilters, 300));
    DOMElements.provinceFilter.addEventListener('change', applyFilters);
    DOMElements.statusFilter.addEventListener('change', applyFilters);
    DOMElements.regionFilter.addEventListener('change', applyFilters);
    DOMElements.branchStatusFilter.addEventListener('change', applyFilters);
    DOMElements.recorderFilter.addEventListener('change', applyFilters);

    // Buttons
    DOMElements.addBranchBtn.addEventListener('click', openAddModal);
    DOMElements.exportExcelBtn.addEventListener('click', () => openExportModal('excel'));
    DOMElements.exportCsvBtn.addEventListener('click', () => openExportModal('csv'));
    DOMElements.exportPdfBtn.addEventListener('click', () => openExportModal('pdf'));
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
            } else if (exportType === 'pdf') {
                exportPDF(fileName);   // << ต้องมีบรรทัดนี้
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

    // Event Delegation สำหรับปุ่ม "จัดการ" ในตาราง
    // วิธีนี้ทำให้เราไม่ต้องผูก Event ให้ทุกปุ่ม แต่ดักฟังที่ตัวแม่ (tbody) ทีเดียว
    DOMElements.branchTableBody.addEventListener('click', (event) => {
        const btn = event.target.closest('.btn-manage');
        if (!btn) return;
        const idAttr = btn.dataset.id;
        if (!idAttr) {
            showNotification({ type: 'error', title: 'ผิดพลาด', message: 'ID ไม่ถูกต้อง' });
            return;
        }
        openDetailsModal(Number(idAttr));
    });

    // Event Listener สำหรับการคลิกหัวตารางเพื่อเรียงข้อมูล
    DOMElements.tableHeader.addEventListener('click', (event) => {
        const header = event.target.closest('.table-sortable');
        if (!header) return;

        const newSortColumn = header.dataset.column;

        if (sortColumn === newSortColumn) {
            // ถ้าคลิกคอลัมน์เดิม ให้สลับทิศทาง
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // ถ้าคลิกคอลัมน์ใหม่ ให้เริ่มเรียงจากน้อยไปมาก
            sortColumn = newSortColumn;
            sortDirection = 'asc';
        }

        applyFilters(); // สั่งให้กรองและเรียงข้อมูลใหม่ทั้งหมด
    });
}
