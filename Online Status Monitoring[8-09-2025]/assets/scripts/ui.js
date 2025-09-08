// assets/scripts/ui.js

// ฟังก์ชันสำหรับอัปเดต UI ของหัวตาราง (แสดงลูกศร)
function updateSortIndicators() {
    DOMElements.tableHeader.querySelectorAll('th.table-sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.column === sortColumn) {
            th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// REFACTORED: ฟังก์ชันกรองข้อมูล
function applyFilters() {
    const searchTerm = DOMElements.searchInput.value.toLowerCase();
    const provinceFilter = DOMElements.provinceFilter.value;
    const statusFilter = DOMElements.statusFilter.value;
    const regionFilter = DOMElements.regionFilter.value; // ดึงค่าตัวกรองภาค
    const branchStatusFilter = DOMElements.branchStatusFilter.value; // ดึงค่าตัวกรองสถานะ
    const recorderFilter = DOMElements.recorderFilter.value; // ดึงค่าตัวกรองเครื่องบันทึก

    filteredBranches = allBranches.filter(branch => {
        const matchesSearch = !searchTerm ||
            Object.values(branch).some(val => 
                String(val).toLowerCase().includes(searchTerm)
            );
        const matchesProvince = !provinceFilter || branch.province === provinceFilter;
        const matchesStatus = !statusFilter ||
            (statusFilter === 'online' && branch.onlineStatus === 'สามารถเชื่อม Online') ||
            (statusFilter === 'offline' && branch.onlineStatus !== 'สามารถเชื่อม Online')||
            (statusFilter === 'cctv' && branch.onlineStatus === 'ร้านไม่ติดกล้อง CCTV');

        const matchesRegion = !regionFilter || branch.region === regionFilter;
        const matchesBranchStatus = !branchStatusFilter || branch.status === branchStatusFilter;
        const matchesRecorder = !recorderFilter || branch.recorder === recorderFilter;

        return matchesSearch && matchesProvince && matchesStatus && matchesRegion && matchesBranchStatus && matchesRecorder;
    });

    filteredBranches.sort((a, b) => {
        const valA = a[sortColumn] || '';
        const valB = b[sortColumn] || '';

        // ตรวจสอบว่าเป็นตัวเลขหรือไม่
        const isNumber = !isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '';
        
        let comparison = 0;
        if (isNumber) {
            // ถ้าเป็นตัวเลข ให้เรียงแบบตัวเลข
            comparison = parseFloat(valA) - parseFloat(valB);
        } else {
            // ถ้าเป็นข้อความ ให้เรียงแบบข้อความ (เหมือนเดิม)
            comparison = String(valA).localeCompare(String(valB), 'th');
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    currentPage = 1;
    refreshUI(); // REFACTORED: เรียกฟังก์ชันเดียวเพื่ออัพเดท UI ทั้งหมด
}

// ฟังก์ชันกลางสำหรับอัพเดท UI ทั้งหมด
function refreshUI() {
    updateTable();
    updatePagination();
    updateStats(); // แก้ไข: ลบการเรียกซ้ำ
    updateProvinceFilter();
    updateRegionFilter(); // เพิ่ม: อัพเดทตัวกรองภาค
    updateBranchStatusFilter(); // เพิ่ม: อัพเดทตัวกรองสถานะสาขา
    updateRecorderFilter(); // เพิ่ม: อัพเดทตัวกรองเครื่องบันทึก
    updateSortIndicators();
}

// ฟังก์ชันสำหรับอัพเดท table ทั้งหมด
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
                <td>${highlightText(branch.region, searchTerm) || ''}</td>
                <td>${highlightText(branch.status, searchTerm) || '-'}</td>
                <td>${statusDisplayHtml}</td>
                <td>${highlightText(branch.recorder, searchTerm) || '-'}</td>
                <td>${highlightText(branch.district, searchTerm) || ''}</td>
                <td>${highlightText(branch.province, searchTerm) || ''}</td>
                <td>${highlightText(branch.phone, searchTerm) || '-'}</td>
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

    updateChartAndSummary(); 
}

// ฟังก์ชันสำหรับอัปเดตกราฟและ Summary Cards
// NEW: ฟังก์ชันสำหรับอัปเดตกราฟและ Summary Cards
function updateChartAndSummary() {
    // ตัวแมปสำหรับแปลงค่า 'status' ให้เป็นข้อความและ emoji ที่ต้องการ
    const statusDisplayNames = {
        'ปตท': '<span class="badge">⛽</span> ปตท (PTT Station)',
        'CO': '<span class="badge">🏢</span> CO (Company Owned)',
        'SBP': '<span class="badge">🤝</span> SBP (Sub Business Partner)',
        'Sub-Area': '<span class="badge">📍</span> Sub-Area (พื้นที่ย่อย)',
        'ร้านไม่ติดกล้อง CCTV': '<span class="badge">❌</span> ไม่ติดกล้อง CCTV',
        'ไม่ระบุ': '<span class="badge">❓</span> ไม่ระบุ',
    };

    // 1. รวบรวมข้อมูลสถานะทั้งหมดจากคอลัมน์ 'status' และนับจำนวน Online/Offline
    const statusData = {};
    allBranches.forEach(branch => {
        const status = branch.status || 'ไม่ระบุ';
        if (!statusData[status]) {
            statusData[status] = { total: 0, online: 0, offline: 0 };
        }
        statusData[status].total++;
        if (branch.onlineStatus === 'สามารถเชื่อม Online') {
            statusData[status].online++;
        } else {
            statusData[status].offline++;
        }
    });

    // 2. สร้าง Summary Cards แบบไดนามิก
    let summaryHtml = '';
    const sortedStatuses = Object.keys(statusData).sort();

    sortedStatuses.forEach(status => {
        const data = statusData[status];
        const rate = data.total > 0 ? ((data.online / data.total) * 100).toFixed(1) : 0;
        const displayName = statusDisplayNames[status] || status; // ใช้ชื่อที่แปลงแล้ว หรือชื่อเดิมหากไม่มีการแมป

        summaryHtml += `
            <div class="summary-card">
                <div class="summary-type">${displayName}</div>
                <div class="summary-data">
                    <div class="data-item">
                        <div class="value">${data.total}</div>
                        <div class="label">สาขาทั้งหมด</div>
                    </div>
                    <div class="data-item">
                        <div class="value online">${data.online}</div>
                        <div class="label online">Online</div>
                    </div>
                    <div class="data-item">
                        <div class="value offline">${data.offline}</div>
                        <div class="label offline">Offline</div>
                    </div>
                    <div class="data-item">
                        <div class="value rate">${rate}%</div>
                        <div class="label rate">Rate</div>
                    </div>  
                </div>
            </div>
        `;
    });
    DOMElements.statusSummaryContainer.innerHTML = summaryHtml;

    // 3. เตรียมข้อมูลสำหรับกราฟ Chart.js
    const chartLabels = sortedStatuses.map(status => {
        // ใช้ชื่อย่อสำหรับกราฟตามที่ต้องการ
        switch (status) {
            case 'ปตท': return 'ปตท';
            case 'CO': return 'CO';
            case 'SBP': return 'SBP';
            case 'Sub-Area': return 'Sub-Area';
            default: return status;
        }
    });

    const onlineData = sortedStatuses.map(status => statusData[status].online);
    const offlineData = sortedStatuses.map(status => statusData[status].offline);

    // 4. อัปเดตกราฟ
    if (window.statusChart) {
        window.statusChart.data.labels = chartLabels;
        window.statusChart.data.datasets[0].data = onlineData;
        window.statusChart.data.datasets[1].data = offlineData;
        window.statusChart.update();
    }
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

// NEW: อัพเดทตัวกรองภาค
function updateRegionFilter() {
    const regions = [...new Set(allBranches.map(b => b.region).filter(p => p))].sort();
    const currentValue = DOMElements.regionFilter.value;

    DOMElements.regionFilter.innerHTML = '<option value="">ทุกภาค</option>' +
        regions.map(r => `<option value="${r}">${r}</option>`).join('');

    if (regions.includes(currentValue)) {
        DOMElements.regionFilter.value = currentValue;
    }
}

// NEW: อัพเดทตัวกรองสถานะสาขา
function updateBranchStatusFilter() {
    const statuses = [...new Set(allBranches.map(b => b.status).filter(p => p))].sort();
    const currentValue = DOMElements.branchStatusFilter.value;
    
    DOMElements.branchStatusFilter.innerHTML = '<option value="">ทุกสถานะ</option>' + 
        statuses.map(s => `<option value="${s}">${s}</option>`).join('');

    if (statuses.includes(currentValue)) {
        DOMElements.branchStatusFilter.value = currentValue;
    }
}

// NEW: อัพเดทตัวกรองเครื่องบันทึก
function updateRecorderFilter() {
    const recorders = [...new Set(allBranches.map(b => b.recorder).filter(p => p))].sort();
    const currentValue = DOMElements.recorderFilter.value;

    DOMElements.recorderFilter.innerHTML = '<option value="">ทุกเครื่องบันทึก</option>' +
        recorders.map(r => `<option value="${r}">${r}</option>`).join('');

    if (recorders.includes(currentValue)) {
        DOMElements.recorderFilter.value = currentValue;
    }
}
