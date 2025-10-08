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
    const brandFilter = DOMElements.brandFilter.value; // ดึงค่าตัวกรองยี่ห้อ

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
        const matchesBrand = !brandFilter || branch.brand === brandFilter;

        return matchesSearch && matchesProvince && matchesStatus && matchesRegion && matchesBranchStatus && matchesRecorder && matchesBrand;
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
    updateStats();
    updateProvinceFilter();
    updateRegionFilter();
    updateBranchStatusFilter();
    updateRecorderFilter();
    updateBrandFilter();
    updateSortIndicators();
    updateCharts();

    const activeTab = document.querySelector('.tab-link.active');
    if (activeTab) {
        const chartType = activeTab.dataset.chart;
        if (chartType === 'status') {
            updateStatusChartAndSummary(); // เรียกฟังก์ชันเดิมสำหรับ Status
        } else if (chartType === 'region') {
            updateRegionChart(false, DOMElements.regionChartSortSelect.value);
        } else if (chartType === 'province') {
            updateProvinceChart(false, DOMElements.provinceChartSortSelect.value);
        } else if (chartType === 'recorder') {
            updateRecorderChart(false, DOMElements.recorderChartSortSelect.value);
        } 
    }
}

// ฟังก์ชันสำหรับอัพเดท table ทั้งหมด
function updateTable() {
    if (!DOMElements.branchTableBody) return;
    if (allBranches.length === 0) {
        showEmptyMessage("ยังไม่มีข้อมูล - กรุณา Import ไฟล์ข้อมูลสาขา");
        DOMElements.paginationContainer.style.display = 'none';
        return;
    }

    if (!filteredBranches || filteredBranches.length === 0) {
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
                <td>${statusDisplayHtml}</td>
                <td>${highlightText(branch.region, searchTerm) || ''}</td>
                <td>${highlightText(branch.status, searchTerm) || '-'}</td>
                <td>${highlightText(branch.recorder, searchTerm) || '-'}</td>
                <td>${highlightText(branch.brand, searchTerm) || '-'}</td>
                <td>${highlightText(branch.district, searchTerm) || ''}</td>
                <td>${highlightText(branch.province, searchTerm) || ''}</td>
                <td>${highlightText(branch.phone, searchTerm) || '-'}</td>
                <td>${highlightText(branch.note, searchTerm) || '-'}</td>
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
    if (totalItems === 0) {
        DOMElements.paginationContainer.style.display = 'none';
        return;
    }

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
    const total = filteredBranches.length;
    const online = filteredBranches.filter(b => b.onlineStatus === 'สามารถเชื่อม Online').length;
    const offline = total - online;
    const percentage = total > 0 ? Math.round((online / total) * 100) : 0;

    if (DOMElements.totalBranches) DOMElements.totalBranches.textContent = total;
    if (DOMElements.onlineBranches) DOMElements.onlineBranches.textContent = online;
    if (DOMElements.offlineBranches) DOMElements.offlineBranches.textContent = offline;
    if (DOMElements.onlinePercentage) DOMElements.onlinePercentage.textContent = `${percentage}%`;
}

// --- Summary (แต่ไม่อัปเดต Chart) ---
// ใช้ filteredBranches เป็น source เพื่อให้ summary/กราฟตาม filter ปัจจุบัน
function updateStatusChartAndSummary() {
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;
    if (!DOMElements.statusSummaryContainer) return;

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
    source.forEach(branch => {
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
}

// ฟังก์ชันจัดการการเรียงลำดับกราฟ
function handleChartSort(chartType, sortValue, isFullView = false) {
    if (chartType === 'region') {
        if (isFullView) {
            updateRegionChart(true, sortValue);
        } else {
            updateRegionChart(false, sortValue);
        }
    } else if (chartType === 'province') {
        if (isFullView) {
            updateProvinceChart(true, sortValue);
        } else {
            updateProvinceChart(false, sortValue);
        }
    } else if (chartType === 'recorder') {
        if (isFullView) {
            updateRecorderChart(true, sortValue);
        } else {
            updateRecorderChart(false, sortValue);
        }
    }
}

// ฟังก์ชันสำหรับอัปเดตกราฟภาคและ Summary
function updateRegionChart(isFullView = false, sortDirection = 'online_desc') {
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;
    if (!DOMElements.regionChartCanvas || !DOMElements.regionSummaryContainer) return;

    // 1. รวบรวมข้อมูล
    const regionData = {};
    source.forEach(branch => {
        const region = branch.region || 'ไม่ระบุ';
        if (!regionData[region]) regionData[region] = { online: 0, total: 0 };
        regionData[region].total++;
        if (branch.onlineStatus === 'สามารถเชื่อม Online') {
            regionData[region].online++;
        }
    });

    // 2. แปลงข้อมูลให้อยู่ในรูปแบบที่เรียงได้
    const dataForChart = Object.keys(regionData).map(key => ({
        label: key,
        onlineCount: regionData[key].online,
        totalCount: regionData[key].total
    }));

    // 3. เรียงลำดับข้อมูล
    if (sortDirection === 'online_asc') {
        dataForChart.sort((a, b) => a.onlineCount - b.onlineCount);
    } else {
        dataForChart.sort((a, b) => b.onlineCount - a.onlineCount);
    }

    // 4. เลือกเฉพาะ Top 10 หากไม่ใช่ Full View
    const dataToDisplay = isFullView ? dataForChart : dataForChart.slice(0, 10);

    // 5. สร้างหรืออัปเดตกราฟ
    const chartLabels = dataToDisplay.map(item => item.label);
    const chartOnlineData = dataToDisplay.map(item => item.onlineCount);

    if (window.regionChart) {
        window.regionChart.destroy();
    }

    // กำหนด Canvas ID ที่จะใช้
    const canvasId = isFullView ? 'fullChartCanvas' : 'regionChartCanvas';
    const canvas = document.getElementById(canvasId);

    window.regionChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'จำนวนสาขา Online',
                data: chartOnlineData,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // ทำให้เป็นแนวนอน
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });

    // 6. อัปเดต Summary Cards
    const summaryContainer = isFullView ? DOMElements.fullChartSummaryContainer : DOMElements.regionSummaryContainer;
    updateSummaryCards(dataToDisplay, summaryContainer);
}

// ฟังก์ชันสำหรับอัปเดตกราฟจังหวัดและ Summary
function updateProvinceChart(isFullView = false, sortDirection = 'online_desc') {
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;
    if (!DOMElements.provinceChartCanvas || !DOMElements.provinceSummaryContainer) return;

    // 1. รวบรวมข้อมูล
    const provinceData = {};
    source.forEach(branch => {
        const province = branch.province || 'ไม่ระบุ';
        if (!provinceData[province]) provinceData[province] = { online: 0, total: 0 };
        provinceData[province].total++;
        if (branch.onlineStatus === 'สามารถเชื่อม Online') {
            provinceData[province].online++;
        }
    });

    // 2. แปลงข้อมูลให้อยู่ในรูปแบบที่เรียงได้
    const dataForChart = Object.keys(provinceData).map(key => ({
        label: key,
        onlineCount: provinceData[key].online,
        totalCount: provinceData[key].total
    }));

    // 3. เรียงลำดับข้อมูล
    if (sortDirection === 'online_asc') {
        dataForChart.sort((a, b) => a.onlineCount - b.onlineCount);
    } else {
        dataForChart.sort((a, b) => b.onlineCount - a.onlineCount);
    }

    // 4. เลือกเฉพาะ Top 10 หากไม่ใช่ Full View
    const dataToDisplay = isFullView ? dataForChart : dataForChart.slice(0, 10);

    // 5. สร้างหรืออัปเดตกราฟ
    const chartLabels = dataToDisplay.map(item => item.label);
    const chartOnlineData = dataToDisplay.map(item => item.onlineCount);

    if (window.provinceChart) {
        window.provinceChart.destroy();
    }

    // กำหนด Canvas ID ที่จะใช้
    const canvasId = isFullView ? 'fullChartCanvas' : 'provinceChartCanvas';
    const canvas = document.getElementById(canvasId);

    window.provinceChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'จำนวนสาขา Online',
                data: chartOnlineData,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // ทำให้เป็นแนวนอน
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });

    // 6. อัปเดต Summary Cards
    const summaryContainer = isFullView ? DOMElements.fullChartSummaryContainer : DOMElements.provinceSummaryContainer;
    updateSummaryCards(dataToDisplay, summaryContainer);
}

// ฟังก์ชันสำหรับอัปเดตกราฟเครื่องบันทึกภาพและ Summary
function updateRecorderChart(isFullView = false, sortDirection = 'online_desc') {
    const source = (filteredBranches && filteredBranches.length) ? filteredBranches : allBranches;
    if (!DOMElements.recorderChartCanvas || !DOMElements.recorderSummaryContainer) return;

    // 1. รวบรวมข้อมูล
    const recorderData = {};
    source.forEach(branch => {
        const recorder = branch.recorder || 'ไม่ระบุ';
        if (!recorderData[recorder]) recorderData[recorder] = { online: 0, total: 0 };
        recorderData[recorder].total++;
        if (branch.onlineStatus === 'สามารถเชื่อม Online') {
            recorderData[recorder].online++;
        }
    });

    // 2. แปลงข้อมูลให้อยู่ในรูปแบบที่เรียงได้
    const dataForChart = Object.keys(recorderData).map(key => ({
        label: key,
        onlineCount: recorderData[key].online,
        totalCount: recorderData[key].total
    }));

    // 3. เรียงลำดับข้อมูล
    if (sortDirection === 'online_asc') {
        dataForChart.sort((a, b) => a.onlineCount - b.onlineCount);
    } else {
        dataForChart.sort((a, b) => b.onlineCount - a.onlineCount);
    }

    // 4. เลือกเฉพาะ Top 10 หากไม่ใช่ Full View
    const dataToDisplay = isFullView ? dataForChart : dataForChart.slice(0, 10);

    // 5. สร้างหรืออัปเดตกราฟ
    const chartLabels = dataToDisplay.map(item => item.label);
    const chartOnlineData = dataToDisplay.map(item => item.onlineCount);

    if (window.recorderChart) {
        window.recorderChart.destroy();
    }

    // กำหนด Canvas ID ที่จะใช้
    const canvasId = isFullView ? 'fullChartCanvas' : 'recorderChartCanvas';
    const canvas = document.getElementById(canvasId);

    window.recordereChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'จำนวนสาขา Online',
                data: chartOnlineData,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // ทำให้เป็นแนวนอน
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });

    // 6. อัปเดต Summary Cards
    const summaryContainer = isFullView ? DOMElements.fullChartSummaryContainer : DOMElements.recorderSummaryContainer;
    updateSummaryCards(dataToDisplay, summaryContainer);
}

// NEW: ฟังก์ชันสำหรับอัปเดต Summary Cards แบบทั่วไป
function updateSummaryCards(dataToDisplay, container) {
    if (!container) return;

    const summaryHtml = dataToDisplay.map(item => {
        const onlineRate = item.totalCount > 0 ? ((item.onlineCount / item.totalCount) * 100).toFixed(1) : 0;
        return `
            <div class="summary-card">
                <div class="summary-type"><span class="badge">📍</span> ${item.label}</div>
                <div class="summary-data">
                    <div class="data-item">
                        <div class="value">${item.totalCount}</div>
                        <div class="label">สาขาทั้งหมด</div>
                    </div>
                    <div class="data-item">
                        <div class="value online">${item.onlineCount}</div>
                        <div class="label online">Online</div>
                    </div>
                    <div class="data-item">
                        <div class="value rate">${onlineRate}%</div>
                        <div class="label rate">Rate</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    container.innerHTML = summaryHtml;
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

// อัพเดทตัวกรองภาค
function updateRegionFilter() {
    const regions = [...new Set(allBranches.map(b => b.region).filter(p => p))].sort();
    const currentValue = DOMElements.regionFilter.value;

    DOMElements.regionFilter.innerHTML = '<option value="">ทุกภาค</option>' +
        regions.map(r => `<option value="${r}">${r}</option>`).join('');

    if (regions.includes(currentValue)) {
        DOMElements.regionFilter.value = currentValue;
    }
}

// อัพเดทตัวกรองสถานะสาขา
function updateBranchStatusFilter() {
    const statuses = [...new Set(allBranches.map(b => b.status).filter(p => p))].sort();
    const currentValue = DOMElements.branchStatusFilter.value;
    
    DOMElements.branchStatusFilter.innerHTML = '<option value="">ทุกสถานะ</option>' + 
        statuses.map(s => `<option value="${s}">${s}</option>`).join('');

    if (statuses.includes(currentValue)) {
        DOMElements.branchStatusFilter.value = currentValue;
    }
}

// อัพเดทตัวกรองเครื่องบันทึก
function updateRecorderFilter() {
    const recorders = [...new Set(allBranches.map(b => b.recorder).filter(p => p))].sort();
    const currentValue = DOMElements.recorderFilter.value;

    DOMElements.recorderFilter.innerHTML = '<option value="">ทุกเครื่องบันทึก</option>' +
        recorders.map(r => `<option value="${r}">${r}</option>`).join('');

    if (recorders.includes(currentValue)) {
        DOMElements.recorderFilter.value = currentValue;
    }
}

// อัพเดทตัวกรองยี่ห้อ
function updateBrandFilter() {
    const brands = [...new Set(allBranches.map(b => b.brand).filter(p => p))].sort();
    const currentValue = DOMElements.brandFilter.value;

    DOMElements.brandFilter.innerHTML = '<option value="">ทุกเครื่องบันทึก</option>' +
        brands.map(r => `<option value="${r}">${r}</option>`).join('');

    if (brands.includes(currentValue)) {
        DOMElements.brandFilter.value = currentValue;
    }
}

// ฟังก์ชันสำหรับดึงรายการจังหวัดทั้งหมดที่ไม่ซ้ำกัน
function getUniqueProvinces() {
    const provinces = [...new Set(allBranches.map(b => b.province).filter(p => p))];
    // เรียงลำดับจังหวัดตามตัวอักษร
    provinces.sort((a, b) => a.localeCompare(b, 'th-TH'));
    return provinces;
}

// ฟังก์ชันสำหรับสร้างและอัปเดต dropdown ของจังหวัด
function updateProvinceDropdown(selectElement) {
    const provinces = getUniqueProvinces();
    selectElement.innerHTML = '<option value="">เลือกจังหวัด</option>' + 
        provinces.map(p => `<option value="${p}">${p}</option>`).join('');
}
