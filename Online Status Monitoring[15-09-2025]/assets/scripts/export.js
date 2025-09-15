// assets/scripts/export.js

// ----------------------------- REFACTORED: Export functions (Excel) -----------------------------
function exportExcel(fileName) {
    try{
        if (allBranches.length === 0) {
            showNotification({ type: 'error', title: 'ไม่มีข้อมูล', message: 'ไม่มีข้อมูลสำหรับส่งออก' });
            return;
        }
        const headers = [
            'รหัสร้าน', 'ชื่อสาขา', 'ภาค', 'สถานะ', 'สถานะเชื่อมOnline', 'เครื่องบันทึกภาพ',
            'ยี่ห้อ', 'อำเภอ', 'จังหวัด', 'เบอร์โทรร้าน', 'FC.', 'เบอร์โทร Hybrid FC',
            'เขต', 'เบอร์โทร Hybrid เขต', 'ฝ่าย', 'เบอร์โทร Hybrid ฝ่าย', 'GM.',
            'เบอร์โทร Hybrid GM', 'AVP', 'เบอร์โทร Hybrid AVP'
        ];
        const dataToExport = allBranches.map(b => [
            b.storeCode, b.branchName, b.region, b.status, b.onlineStatus, b.recorder,
            b.brand, b.district, b.province, b.phone, b.fc, b.phone_fc, b.zone,
            b.phone_zone, b.department, b.phone_dept, b.gm, b.phone_gm, b.avp, b.phone_avp
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
        worksheet['!cols'] = headers.map(() => ({ wch: 20 })); // ตั้งค่าความกว้างคอลัมน์
        const workbook = XLSX.utils.book_new(); 
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Branch Data');
        logActivity('EXPORT EXCEL', `ส่งออกข้อมูลเป็น Excel ชื่อไฟล์ ${fileName}.xlsx`);
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        showNotification({ type: "success", title: "สำเร็จ", message: `บันทึก Excel เรียบร้อย: ${fileName}.xlsx` });            
    } catch (error) {
        console.error("Failed to export Excel:", error);
        showNotification({ type: "error", title: "ผิดพลาด", message: "ไม่สามารถส่งออก .xlsx ได้" });
    }
}

// ----------------------------- REFACTORED: Export functions (CSV) -----------------------------
function exportCSV(fileName) {
    try{
        if (allBranches.length === 0) {
            showNotification({ type: 'error', title: 'ไม่มีข้อมูล', message: 'ไม่มีข้อมูลสำหรับส่งออก' });
            return;
        }
        const headers = [
            'รหัสร้าน', 'ชื่อสาขา', 'ภาค', 'สถานะ', 'สถานะเชื่อมOnline', 'เครื่องบันทึกภาพ',
            'ยี่ห้อ', 'อำเภอ', 'จังหวัด', 'เบอร์โทรร้าน', 'FC.', 'เบอร์โทร Hybrid FC',
            'เขต', 'เบอร์โทร Hybrid เขต', 'ฝ่าย', 'เบอร์โทร Hybrid ฝ่าย', 'GM.',
            'เบอร์โทร Hybrid GM', 'AVP', 'เบอร์โทร Hybrid AVP'
        ];
        const dataToExport = allBranches.map(b => [
            b.storeCode, b.branchName, b.region, b.status, b.onlineStatus, b.recorder,
            b.brand, b.district, b.province, b.phone, b.fc, b.phone_fc, b.zone,
            b.phone_zone, b.department, b.phone_dept, b.gm, b.phone_gm, b.avp, b.phone_avp
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
        showNotification({ type: "success", title: "สำเร็จ", message: `บันทึก CSV เรียบร้อย: ${fileName}.csv` });
    } catch (error) {
        console.error("Failed to export CSV:", error);
        showNotification({ type: "error", title: "ผิดพลาด", message: "ไม่สามารถส่งออก .csv ได้" });
    }
}   

// ----------------------------- REFACTORED: Export functions (PDF) -----------------------------
const _TOTAL_PAGES_PLACEHOLDER = '__totalPages__';
const _A4_PX = { width: 794, height: 1123 }; // approximated A4 px at 96dpi
const _PDF_MM = { width: 210, height: 297 };
const _PX_PER_MM = _A4_PX.width / _PDF_MM.width; // ~3.78 px per mm
const _MARGIN_MM = { left: 12, right: 12, top: 18, bottom: 18 };
const _HEADER_MM = 14;
const _FOOTER_MM = 14;
const _PRINTABLE_WIDTH_MM = _PDF_MM.width - _MARGIN_MM.left - _MARGIN_MM.right;
const _PRINTABLE_HEIGHT_MM = _PDF_MM.height - _MARGIN_MM.top - _MARGIN_MM.bottom - _HEADER_MM - _FOOTER_MM;

function _safeCall(fn, ...args) {
    try { if (typeof fn === 'function') fn(...args); } catch (e) { console.warn(e); }
}

function _nowStrings() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    // Manually construct the date and time strings to ensure compatibility
    const date = `${year}-${month}-${day}`;
    const time = `${hours}:${minutes}`;

    return {
        now,
        date,
        time
    };
}

function _drawHeader(doc, pageNumber, totalPagesText) {
    const title = 'รายงานสรุประบบจัดการข้อมูลสาขา';
    const subtitle = 'Branch Management System - Online Status Monitoring';

    doc.setDrawColor(220);
    doc.setLineWidth(0.4);
    doc.line(_MARGIN_MM.left, _MARGIN_MM.top - 6, _PDF_MM.width - _MARGIN_MM.right, _MARGIN_MM.top - 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(title, _MARGIN_MM.left, _MARGIN_MM.top - 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(subtitle, _MARGIN_MM.left, _MARGIN_MM.top + 5);
}

function _drawFooter(doc, pageNumber, totalPagesText) {
    const { date, time } = _nowStrings();
    const pageText = `page ${pageNumber}${totalPagesText ? ' / ' + totalPagesText : ''}`;

    doc.setDrawColor(220);
    doc.setLineWidth(0.4);
    doc.line(_MARGIN_MM.left, _PDF_MM.height - _MARGIN_MM.bottom + 6, _PDF_MM.width - _MARGIN_MM.right, _PDF_MM.height - _MARGIN_MM.bottom + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
   doc.text(`${date} ${time}`, _MARGIN_MM.left, _PDF_MM.height - _MARGIN_MM.bottom + 12);

    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, _PDF_MM.width - _MARGIN_MM.right - textWidth, _PDF_MM.height - _MARGIN_MM.bottom + 12);
}

// Render a DOM node to a canvas at high DPI using html2canvas
async function _renderNodeToCanvas(node, opts = {}) {
    if (typeof html2canvas !== 'function') throw new Error('html2canvas is required');
    const scale = opts.scale || 2;
    return await html2canvas(node, {
        scale,
        useCORS: true,
        backgroundColor: opts.backgroundColor ?? '#f1f4f8',
        logging: false,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight
    });
}

// Create a blank A4 page container (in px) with safe content area (reserves header/footer)
function _createPageDiv() {
    const page = document.createElement('div');
    page.style.width = _A4_PX.width + 'px';
    page.style.height = _A4_PX.height + 'px';
    page.style.boxSizing = 'border-box';
    page.style.padding = '0';
    page.style.background = '#f1f4f8';
    page.style.fontFamily = '"TH Sarabun New", "Sarabun", Arial, sans-serif';
    page.style.color = '#111827';

    const content = document.createElement('div');
    const headerPx = Math.round(_HEADER_MM * _PX_PER_MM);
    const footerPx = Math.round(_FOOTER_MM * _PX_PER_MM);
    content.style.position = 'relative';
    content.style.boxSizing = 'border-box';
    content.style.padding = '18px';
    content.style.width = '100%';
    content.style.height = (_A4_PX.height - headerPx - footerPx) + 'px';
    content.style.marginTop = headerPx + 'px';
    content.style.marginBottom = footerPx + 'px';
    content.style.overflow = 'hidden';
    page.appendChild(content);

    return { page, content };
}

// ----------------------- Re-implemented Builder Functions -----------------------

// Build page 1: summary (download info, overview cards, system status)
function _buildPage1({ total, online, offline, percent, downloadDate, downloadTime, systemHtml }) {
    const { page, content } = _createPageDiv();

    // ส่วนหัว, ข้อมูลดาวน์โหลด, สรุปภาพรวม, และสถานะระบบ (จากโค้ดต้นฉบับ)
    const mainContentHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">รายงานสรุประบบจัดการข้อมูลสาขา</h1>
            <h2 style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Branch Management System - Online Status Monitoring</h2>
        </div>
        <div style="margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #495057;">📋 ข้อมูลการดาวน์โหลด</h3>
            <p style="margin: 5px 0; color: #6c757d;"><strong>วันที่:</strong> ${downloadDate}</p>
            <p style="margin: 5px 0; color: #6c757d;"><strong>เวลา:</strong> ${downloadTime} น.</p>
        </div>
        <div style="margin-bottom: 30px;">
            <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">📊 สรุปข้อมูลภาพรวม</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px;">จำนวนสาขาทั้งหมด</h4>
                    <p style="margin: 0; font-size: 28px; font-weight: bold;">${total}</p>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">สาขา</p>
                </div>
                <div style="background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px;">สาขาที่ Online</h4>
                    <p style="margin: 0; font-size: 28px; font-weight: bold;">${online}</p>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">สาขา</p>
                </div>
                <div style="background: linear-gradient(135deg, #e74c4c, #c0392b); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px;">สาขาที่ Offline</h4>
                    <p style="margin: 0; font-size: 28px; font-weight: bold;">${offline}</p>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">สาขา</p>
                </div>
                <div style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px;">อัตราออนไลน์</h4>
                    <p style="margin: 0; font-size: 28px; font-weight: bold;">${percent}</p>
                    <p style="margin: 5px 0 0 0; opacity: 0.9;">เปอร์เซ็นต์</p>
                </div>
            </div>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
                <h4 style="margin: 0 0 10px 0; color: #1976d2;">📈 สถานะระบบ</h4>
                ${systemHtml}
            </div>
        </div>
    `;

    content.innerHTML = mainContentHTML;
    return page;
}

// Build page 2: chart and branch-type summary
function _buildPage2({ chartDataUrl, branchTypeSummary }) {
    const { page, content } = _createPageDiv();

    // เพิ่มส่วนของกราฟ
    const chartDiv = document.createElement('div');
    chartDiv.style.marginTop = '30px';
    chartDiv.innerHTML = `
        <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">📈 กราฟแสดงสถานะสาขา</h3>
        <div style="background: #fdfdfd; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #2ecc71; text-align: center;">
            <img id="chartImage" src="${chartDataUrl || ''}" style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
        </div>
    `;
    content.appendChild(chartDiv);

    // เพิ่ม Summary Card ที่มีหน้าตาเหมือนในเว็บ (จากโค้ดต้นฉบับ)
    const chartSummaryDiv = document.createElement('div');
    chartSummaryDiv.classList.add('chart-summary');
    chartSummaryDiv.id = 'statusSummaryContainer';
    chartSummaryDiv.style.marginTop = '30px';
    chartSummaryDiv.style.display = 'grid';
    chartSummaryDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
    chartSummaryDiv.style.gap = '20px';
    chartSummaryDiv.innerHTML = `
        <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; grid-column: 1 / -1;">📊 สรุปข้อมูลตามสถานะสาขา</h3>
        
        <div class="summary-card" style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border-left: 4px solid #3b82f6; display: flex; flex-direction: column; justify-content: space-between;">
            <div class="summary-type" style="font-size: 1em; font-weight: 700; color: #374151; margin-bottom: 12px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background-color: #e0f7fa; color: #00796b; font-size: 12px; margin-right: 8px;">🏢</span> CO (Company Owned)
            </div>
            <div class="summary-data" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div class="data-item" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">ทั้งหมด</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #272727;">${branchTypeSummary.co.total}</div>
                </div>
                <div class="data-item online" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Online</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #16a34a;">${branchTypeSummary.co.online}</div>
                </div>
                <div class="data-item offline" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Offline</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #dc2626;">${branchTypeSummary.co.offline}</div>
                </div>
                <div class="data-item rate" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Rate</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #2563eb;">${branchTypeSummary.co.rate}</div>
                </div>
            </div>
        </div>
        <div class="summary-card" style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border-left: 4px solid #10b981; display: flex; flex-direction: column; justify-content: space-between;">
            <div class="summary-type" style="font-size: 1em; font-weight: 700; color: #374151; margin-bottom: 12px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background-color: #fff3e0; color: #e65100; font-size: 12px; margin-right: 8px;">🤝</span> SBP (Sub Business Partner)
            </div>
            <div class="summary-data" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div class="data-item" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">ทั้งหมด</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #272727;">${branchTypeSummary.sbp.total}</div>
                </div>
                <div class="data-item online" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Online</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #16a34a;">${branchTypeSummary.sbp.online}</div>
                </div>
                <div class="data-item offline" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Offline</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #dc2626;">${branchTypeSummary.sbp.offline}</div>
                </div>
                <div class="data-item rate" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Rate</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #2563eb;">${branchTypeSummary.sbp.rate}</div>
                </div>
            </div>
        </div>
        <div class="summary-card" style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border-left: 4px solid #f59e0b; display: flex; flex-direction: column; justify-content: space-between;">
            <div class="summary-type" style="font-size: 1em; font-weight: 700; color: #374151; margin-bottom: 12px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background-color: #f3e5f5; color: #4a148c; font-size: 12px; margin-right: 8px;">📍</span> Sub-Area (พื้นที่ย่อย)
            </div>
            <div class="summary-data" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div class="data-item" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">ทั้งหมด</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #272727;">${branchTypeSummary.subArea.total}</div>
                </div>
                <div class="data-item online" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Online</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #16a34a;">${branchTypeSummary.subArea.online}</div>
                </div>
                <div class="data-item offline" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Offline</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #dc2626;">${branchTypeSummary.subArea.offline}</div>
                </div>
                <div class="data-item rate" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Rate</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #2563eb;">${branchTypeSummary.subArea.rate}</div>
                </div>
            </div>
        </div>
        <div class="summary-card" style="background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border-left: 4px solid #ef4444; display: flex; flex-direction: column; justify-content: space-between;">
            <div class="summary-type" style="font-size: 1em; font-weight: 700; color: #374151; margin-bottom: 12px;">
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background-color: #e8f5e9; color: #1b5e20; font-size: 12px; margin-right: 8px;">⛽</span> ปตท (PTT Station)
            </div>
            <div class="summary-data" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div class="data-item" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">ทั้งหมด</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #272727;">${branchTypeSummary.ptt.total}</div>
                </div>
                <div class="data-item online" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Online</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #16a34a;">${branchTypeSummary.ptt.online}</div>
                </div>
                <div class="data-item offline" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Offline</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #dc2626;">${branchTypeSummary.ptt.offline}</div>
                </div>
                <div class="data-item rate" style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;">
                    <div class="label" style="font-size: 0.75em; font-weight: 600; color: #6b7280; margin-bottom: 2px; white-space: nowrap;">Rate</div>
                    <div class="value" style="font-size: 1.1em; font-weight: 700; color: #2563eb;">${branchTypeSummary.ptt.rate}</div>
                </div>
            </div>
        </div>
    `;
    content.appendChild(chartSummaryDiv);

    return page;
}

// Build region pages (try to fit up to N cards per page)
function _buildRegionPages(regionSummary) {
    const entries = Object.entries(regionSummary || {});
    if (entries.length === 0) {
        const { page } = _createPageDiv();
        const content = page.firstChild;
        const n = document.createElement('div');
        n.style.color = '#6b7280';
        n.textContent = 'ไม่มีข้อมูลสรุปตามภาค';
        content.appendChild(n);
        return [page];
    }
    const perPage = 18; // 3 columns x 6 rows
    const pages = [];
    for (let i = 0; i < entries.length; i += perPage) {
        const slice = entries.slice(i, i + perPage);
        const { page, content } = _createPageDiv();
        const title = document.createElement('div');
        title.style.fontWeight = '700';
        title.style.marginBottom = '8px';
        title.textContent = '🌍 สรุปข้อมูลตามภาค';
        content.appendChild(title);

        const grid = document.createElement('div');
        grid.style.display = 'flex';
        grid.style.flexWrap = 'wrap';
        grid.style.gap = '10px';
        slice.forEach(([region, data]) => {
            const card = document.createElement('div');
            card.style.flex = '1 1 220px';
            card.style.minWidth = '220px';
            card.style.background = '#fff';
            card.style.border = '1px solid #e8eef8';
            card.style.borderRadius = '8px';
            card.style.padding = '10px';
            card.style.boxSizing = 'border-box';
            card.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">${region}</div>
                <div style="font-size:12px;color:#374151;">สาขาทั้งหมด: <b>${data.total}</b></div>
                <div style="font-size:12px;color:#16a34a;">Online: <b>${data.online}</b></div>
                <div style="font-size:12px;color:#dc2626;">Offline: <b>${data.offline}</b></div>`;
            grid.appendChild(card);
        });
        content.appendChild(grid);
        pages.push(page);
    }
    return pages;
}

// Build province pages (chunk into multiple pages as needed)
function _buildProvincePages(provinceSummary) {
    const entries = Object.entries(provinceSummary || {});
    if (entries.length === 0) {
        const { page } = _createPageDiv();
        const content = page.firstChild;
        const n = document.createElement('div');
        n.style.color = '#6b7280';
        n.textContent = 'ไม่มีข้อมูลสรุปตามจังหวัด';
        content.appendChild(n);
        return [page];
    }
    const perPage = 27  ; // 3 columns x 10 rows suggested
    const pages = [];
    for (let i = 0; i < entries.length; i += perPage) {
        const slice = entries.slice(i, i + perPage);
        const { page, content } = _createPageDiv();
        const title = document.createElement('div');
        title.style.fontWeight = '700';
        title.style.marginBottom = '8px';
        title.textContent = '📍 สรุปข้อมูลตามจังหวัด';
        content.appendChild(title);

        const grid = document.createElement('div');
        grid.style.display = 'flex';
        grid.style.flexWrap = 'wrap';
        grid.style.gap = '10px';
        slice.forEach(([prov, data]) => {
            const card = document.createElement('div');
            // card.style.flex = '1 1 calc(50% - 10px)'; // two columns
            card.style.flex = '1 1 calc((100% - 20px) / 3)'; // three columns
            card.style.minWidth = '220px';
            card.style.background = '#fff';
            card.style.border = '1px solid #e8eef8';
            card.style.borderRadius = '8px';
            card.style.padding = '10px';
            card.style.boxSizing = 'border-box';
            card.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">${prov}</div>
                <div style="font-size:12px;color:#374151;">สาขาทั้งหมด: <b>${data.total}</b></div>
                <div style="font-size:12px;color:#16a34a;">Online: <b>${data.online}</b></div>
                <div style="font-size:12px;color:#dc2626;">Offline: <b>${data.offline}</b></div>`;
            grid.appendChild(card);
        });
        content.appendChild(grid);
        pages.push(page);
    }
    return pages;
}

// ----------------------- Original Helper Functions for Data -----------------------

// NEW: ฟังก์ชันสำหรับคำนวณข้อมูลสรุปตามประเภทสาขา (จากโค้ดแรก)
function getBranchTypeSummaryData() {
    const summary = {
        co: { total: 0, online: 0, offline: 0, rate: '0%' },
        sbp: { total: 0, online: 0, offline: 0, rate: '0%' },
        subArea: { total: 0, online: 0, offline: 0, rate: '0%' },
        ptt: { total: 0, online: 0, offline: 0, rate: '0%' }
    };

    if (typeof filteredBranches === 'undefined') {
        console.error("filteredBranches is not defined. Cannot generate branch type summary.");
        return summary;
    }

    filteredBranches.forEach(branch => {
        const isOnline = branch.onlineStatus === 'สามารถเชื่อม Online';
        const type = branch.status;

        if (type === 'CO') {
            summary.co.total++;
            if (isOnline) {
                summary.co.online++;
            } else {
                summary.co.offline++;
            }
        } else if (type === 'SBP') {
            summary.sbp.total++;
            if (isOnline) {
                summary.sbp.online++;
            } else {
                summary.sbp.offline++;
            }
        } else if (type === 'Sub-Area') {
            summary.subArea.total++;
            if (isOnline) {
                summary.subArea.online++;
            } else {
                summary.subArea.offline++;
            }
        } else if (type === 'ปตท') {
            summary.ptt.total++;
            if (isOnline) {
                summary.ptt.online++;
            } else {
                summary.ptt.offline++;
            }
        }
    });

    summary.co.rate = summary.co.total > 0 ? ((summary.co.online / summary.co.total) * 100).toFixed(2) + '%' : '0%';
    summary.sbp.rate = summary.sbp.total > 0 ? ((summary.sbp.online / summary.sbp.total) * 100).toFixed(2) + '%' : '0%';
    summary.subArea.rate = summary.subArea.total > 0 ? ((summary.subArea.online / summary.subArea.total) * 100).toFixed(2) + '%' : '0%';
    summary.ptt.rate = summary.ptt.total > 0 ? ((summary.ptt.online / summary.ptt.total) * 100).toFixed(2) + '%' : '0%';

    return summary;
}

// NEW: ฟังก์ชันสำหรับคำนวณสรุปข้อมูลตามภาคและจังหวัด (จากโค้ดแรก)
function getDetailedSummaryData() {
    const regionSummary = {};
    const provinceSummary = {};

    if (typeof filteredBranches === 'undefined') {
        console.error("filteredBranches is not defined. Cannot generate detailed summary.");
        return { regionSummary: {}, provinceSummary: {} };
    }

    filteredBranches.forEach(branch => {
        const isOnline = branch.onlineStatus === 'สามารถเชื่อม Online';

        if (branch.region) {
            if (!regionSummary[branch.region]) {
                regionSummary[branch.region] = { total: 0, online: 0, offline: 0 };
            }
            regionSummary[branch.region].total++;
            if (isOnline) {
                regionSummary[branch.region].online++;
            } else {
                regionSummary[branch.region].offline++;
            }
        }

        if (branch.province) {
            if (!provinceSummary[branch.province]) {
                provinceSummary[branch.province] = { total: 0, online: 0, offline: 0 };
            }
            provinceSummary[branch.province].total++;
            if (isOnline) {
                provinceSummary[branch.province].online++;
            } else {
                provinceSummary[branch.province].offline++;
            }
        }
    });

    return { regionSummary, provinceSummary };
}

// NEW: Helper function to generate system status HTML (จากโค้ดแรก)
function getSystemStatusHTML(percent) {
    const onlineRate = parseFloat(percent.replace('%', ''));
    if (onlineRate >= 95) {
        return `<p style="margin: 0; color: #2e7d32;"><span style="font-size: 20px;">🟢</span><strong>สถานะระบบ: ดีเยี่ยม</strong></p><p style="margin: 5px 0 0 0; color: #2e7d32;">ระบบทำงานได้อย่างมีประสิทธิภาพสูง</p>`;
    } else if (onlineRate >= 80) {
        return `<p style="margin: 0; color: #f57c00;"><span style="font-size: 20px;">🟡</span><strong>สถานะระบบ: ดี</strong></p><p style="margin: 5px 0 0 0; color: #f57c00;">ระบบทำงานในระดับที่ยอมรับได้</p>`;
    } else {
        return `<p style="margin: 0; color: #d32f2f;"><span style="font-size: 20px;">🔴</span><strong>สถานะระบบ: ต้องปรับปรุง</strong></p><p style="margin: 5px 0 0 0; color: #d32f2f;">ควรตรวจสอบสาขาที่ออฟไลน์</p>`;
    }
}

// ----------------------- Main PDF export functions -----------------------

// exportPDFWithProgress - shows loading indicator if available
async function exportPDFWithProgress(filename) {
    _safeCall(window.showLoadingIndicator, 'กำลังสร้างรายงาน PDF...');
    try {
        return await exportPDF(filename);
    } finally {
        _safeCall(window.hideLoadingIndicator);
    }
}

// exportPDF - orchestrates building pages and writing PDF
async function exportPDF(filename) {
    _safeCall(window.showLoadingIndicator, 'กำลังสร้างรายงาน PDF...');

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
        const msg = 'ไม่พบ jsPDF (window.jspdf.jsPDF) กรุณาโหลด jsPDF ก่อนเรียกใช้งาน';
        console.error(msg);
        _safeCall(window.showNotification, { type: 'error', title: 'ขาดไลบรารี', message: msg });
        return { success: false, error: msg };
    }
    if (typeof html2canvas === 'undefined') {
        const msg = 'ไม่พบ html2canvas กรุณาโหลด html2canvas ก่อนเรียกใช้งาน';
        console.error(msg);
        _safeCall(window.showNotification, { type: 'error', title: 'ขาดไลบรารี', message: msg });
        return { success: false, error: msg };
    }

    try {
        const { date, time } = _nowStrings();
        const total = document.getElementById('totalBranches')?.textContent || '0';
        const online = document.getElementById('onlineBranches')?.textContent || '0';
        const offline = document.getElementById('offlineBranches')?.textContent || '0';
        const percent = document.getElementById('onlinePercentage')?.textContent || '0%';
        const branchTypeSummary = (typeof getBranchTypeSummaryData === 'function') ? getBranchTypeSummaryData() : { co: { total: 0, online: 0, offline: 0, rate: '0%' }, sbp: { total: 0, online: 0, offline: 0, rate: '0%' }, subArea: { total: 0, online: 0, offline: 0, rate: '0%' }, ptt: { total: 0, online: 0, offline: 0, rate: '0%' } };
        const detailed = (typeof getDetailedSummaryData === 'function') ? getDetailedSummaryData() : { regionSummary: {}, provinceSummary: {} };
        const systemHtml = (typeof getSystemStatusHTML === 'function') ? getSystemStatusHTML(percent) : '';

        // capture chart canvas into data url (if any)
        let chartDataUrl = null;
        try {
            const chartCanvas = document.getElementById('statusChart') || document.querySelector('canvas[data-export-chart]') || document.querySelector('canvas[id*="chart" i]');
            if (chartCanvas) {
                chartDataUrl = chartCanvas.toDataURL('image/png', 1.0);
            }
        } catch (e) {
            console.warn('Unable to extract chart canvas image:', e);
        }

        // Build page DOMs per requested layout
        const pages = [];
        // Page 1
        pages.push(_buildPage1({ total, online, offline, percent, downloadDate: date, downloadTime: time, systemHtml }));
        // Page 2
        pages.push(_buildPage2({ chartDataUrl, branchTypeSummary }));
        // Page 3(s) Region summary
        const regionPages = _buildRegionPages(detailed.regionSummary);
        pages.push(...regionPages);
        // Page 4+ Province summary chunked
        const provincePages = _buildProvincePages(detailed.provinceSummary);
        pages.push(...provincePages);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        let pageIndex = 0;
        for (const pageNode of pages) {
            document.body.appendChild(pageNode);
            await new Promise(r => setTimeout(r, 150));
            const canvas = await _renderNodeToCanvas(pageNode, { scale: 2, backgroundColor: '#f1f4f8' });
            document.body.removeChild(pageNode);

            const imgData = canvas.toDataURL('image/png');
            const pxPerMm = canvas.width / _PDF_MM.width;
            const imgHeightMm = canvas.height / pxPerMm;
            const imgWidthMm = _PDF_MM.width;

            if (pageIndex > 0) doc.addPage();
            const currentPageNumber = pageIndex + 1;
            _drawHeader(doc, currentPageNumber, _TOTAL_PAGES_PLACEHOLDER);
            const x = 0;
            const y = 0;
            doc.addImage(imgData, 'PNG', x, y, imgWidthMm, imgHeightMm, undefined, 'FAST');
            _drawFooter(doc, currentPageNumber, _TOTAL_PAGES_PLACEHOLDER);

            pageIndex++;
        }

        if (typeof doc.putTotalPages === 'function') {
            try { doc.putTotalPages(_TOTAL_PAGES_PLACEHOLDER); } catch (e) { /* ignore */ }
        }

        const finalFileName = `${filename || 'Online_Status_Report'}.pdf`;
        doc.save(finalFileName);

        _safeCall(window.logActivity, 'EXPORT PDF', `ส่งออกรายงาน PDF: ${finalFileName}`);
        _safeCall(window.showNotification, { type: 'success', title: 'ส่งออกสำเร็จ', message: `บันทึกรายงาน PDF เรียบร้อย: ${finalFileName}` });
        return { success: true, fileName: finalFileName };
    } catch (e) {
        console.error('exportPDF failed:', e);
        _safeCall(window.showNotification, { type: 'error', title: 'ผิดพลาด', message: `ไม่สามารถส่งออก PDF ได้: ${e.message}` });
        return { success: false, error: e.message };
    } finally {
        _safeCall(window.hideLoadingIndicator);
    }
}

// Expose functions globally for your UI to call
window.exportPDFWithProgress = exportPDFWithProgress;
window.exportPDF = exportPDF;