// assets/scripts/export.js
// REFACTORED: Focused on PDF export (uses your original data functions)
// NOTE: This file assumes html2canvas and jsPDF (window.jspdf) are loaded on the page.

//////////////////////////////
// --- ORIGINAL EXPORT EXCEL (KEEP AS-IS) ---
//////////////////////////////
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

//////////////////////////////
// --- ORIGINAL EXPORT CSV (KEEP AS-IS) ---
//////////////////////////////
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

//////////////////////////////
// --- PDF EXPORT (IMPROVED) ---
//////////////////////////////

// Page dimensions in mm
const _PDF_PAGE = { width: 210, height: 297 };
const _PDF_MARGINS = { top: 18, right: 12, bottom: 18, left: 12 };
const _TOTAL_PAGES_PLACEHOLDER = '{total_pages_count_string}';

// Show/hide loading indicators if functions exist
function _safeCall(fn, ...args) {
    try { if (typeof fn === 'function') fn(...args); } catch (e) { console.warn(e); }
}

// Main export function with progress
async function exportPDFWithProgress(fileName) {
    _safeCall(window.showLoadingIndicator, 'กำลังสร้างรายงาน PDF...');
    try {
        const result = await exportPDF(fileName);
        return result;
    } finally {
        _safeCall(window.hideLoadingIndicator);
    }
}

// Export PDF - uses addHeaderAndSummaryToPdf internally
async function exportPDF(fileName) {
    _safeCall(window.showLoadingIndicator, 'กำลังสร้างรายงาน PDF...');
    try {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
            const msg = 'ไม่พบ jsPDF (window.jspdf.jsPDF) กรุณาโหลดไลบรารี jsPDF ก่อนใช้ฟังก์ชันนี้';
            console.error(msg);
            _safeCall(window.showNotification, { type: 'error', title: 'ขาดไลบรารี', message: msg });
            return { success: false, error: msg };
        }

        if (typeof html2canvas === 'undefined') {
            const msg = 'ไม่พบ html2canvas กรุณาโหลด html2canvas ก่อนใช้ฟังก์ชันนี้';
            console.error(msg);
            _safeCall(window.showNotification, { type: 'error', title: 'ขาดไลบรารี', message: msg });
            return { success: false, error: msg };
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const finalFileName = `${fileName || 'Online_Status_Report'}.pdf`;

        // Build and add content (this handles header/footer per page and multi-page slicing)
        await addHeaderAndSummaryToPdf(doc);

        // Replace total pages placeholder if plugin available
        if (typeof doc.putTotalPages === 'function') {
            try { doc.putTotalPages(_TOTAL_PAGES_PLACEHOLDER); } catch (e) { /* ignore */ }
        }

        doc.save(finalFileName);

        _safeCall(window.logActivity, 'EXPORT PDF', `ส่งออกรายงาน PDF: ${finalFileName}`);
        _safeCall(window.showNotification, { type: 'success', title: 'ส่งออกสำเร็จ', message: `บันทึกรายงาน PDF เรียบร้อย: ${finalFileName}` });

        return { success: true, fileName: finalFileName };
    } catch (error) {
        console.error('Failed to export PDF:', error);
        _safeCall(window.showNotification, { type: 'error', title: 'เกิดข้อผิดพลาด', message: `ไม่สามารถส่งออก PDF ได้: ${error.message}` });
        return { success: false, error: error.message };
    } finally {
        _safeCall(window.hideLoadingIndicator);
    }
}

// Helper - draw header for each page
function _drawHeader(doc, pageNumber, totalPagesText) {
    const title = 'รายงานสรุประบบจัดการข้อมูลสาขา';
    const subtitle = 'Branch Management System - Online Status Monitoring';

    // thin separator line
    doc.setDrawColor(220);
    doc.setLineWidth(0.4);
    doc.line(_PDF_MARGINS.left, _PDF_MARGINS.top - 6, _PDF_PAGE.width - _PDF_MARGINS.right, _PDF_MARGINS.top - 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(title, _PDF_MARGINS.left, _PDF_MARGINS.top - 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(subtitle, _PDF_MARGINS.left, _PDF_MARGINS.top + 4);
}

// Helper - draw footer for each page
function _drawFooter(doc, pageNumber, totalPagesText) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const pageText = `หน้า ${pageNumber}${totalPagesText ? ' / ' + totalPagesText : ''}`;

    doc.setDrawColor(220);
    doc.setLineWidth(0.4);
    doc.line(_PDF_MARGINS.left, _PDF_PAGE.height - _PDF_MARGINS.bottom + 6, _PDF_PAGE.width - _PDF_MARGINS.right, _PDF_PAGE.height - _PDF_MARGINS.bottom + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${dateStr} ${timeStr}`, _PDF_MARGINS.left, _PDF_PAGE.height - _PDF_MARGINS.bottom + 12);

    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, _PDF_PAGE.width - _PDF_MARGINS.right - pageTextWidth, _PDF_PAGE.height - _PDF_MARGINS.bottom + 12);
}

// Core: create HTML content node and render it to canvas, then slice and add to PDF pages
async function addHeaderAndSummaryToPdf(doc) {
    // Build temp container (this is mostly your original HTML structure, kept intact)
    const tempContainer = document.createElement('div');
    // Use A4 width in px at 96dpi -> 794px (common practice). html2canvas scale will increase resolution.
    tempContainer.style.width = '794px';
    // fixed font-family: avoid unterminated string literal by using single quotes
    tempContainer.style.fontFamily = '"TH Sarabun New", "Sarabun", Arial, sans-serif';
    tempContainer.style.padding = '28px';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.backgroundColor = '#f1f4f8';
    tempContainer.style.color = '#111827';

    const now = new Date();
    const downloadDate = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const downloadTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const total = document.getElementById("totalBranches")?.textContent || "0";
    const online = document.getElementById("onlineBranches")?.textContent || "0";
    const offline = document.getElementById("offlineBranches")?.textContent || "0";
    const percent = document.getElementById("onlinePercentage")?.textContent || "0%";

    const { regionSummary, provinceSummary } = (typeof getDetailedSummaryData === 'function') ? getDetailedSummaryData() : { regionSummary: {}, provinceSummary: {} };
    const branchTypeSummary = (typeof getBranchTypeSummaryData === 'function') ? getBranchTypeSummaryData() : { co:{total:0,online:0,offline:0,rate:'0%'}, sbp:{total:0,online:0,offline:0,rate:'0%'}, subArea:{total:0,online:0,offline:0,rate:'0%'}, ptt:{total:0,online:0,offline:0,rate:'0%'} };

    // Build HTML (kept close to your original)
    const mainContentHTML = `
        <div style="text-align:center;margin-bottom:20px;padding:16px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border-radius:8px;">
            <div style="font-size:20px;font-weight:700;">รายงานสรุประบบจัดการข้อมูลสาขา</div>
            <div style="font-size:12px;margin-top:6px;opacity:0.95;">Branch Management System - Online Status Monitoring</div>
        </div>

        <div style="margin-bottom:16px;padding:12px;background:#fff;border:1px solid #e7edf7;border-left:4px solid #007bff;border-radius:8px;">
            <div style="font-weight:700;margin-bottom:6px;">📋 ข้อมูลการดาวน์โหลด</div>
            <div style="color:#495057;">
                <div>วันที่: ${downloadDate}</div>
                <div>เวลา: ${downloadTime}</div>
            </div>
        </div>

        <div style="margin-bottom:14px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#495057;border-bottom:1px solid #e8eef8;padding-bottom:8px;">📊 สรุปข้อมูลภาพรวม</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;">
                <div style="flex:1;min-width:160px;background:linear-gradient(135deg,#3498db,#2980b9);color:#fff;padding:12px;border-radius:8px;text-align:center;">
                    <div style="font-size:12px;">จำนวนสาขาทั้งหมด</div>
                    <div style="font-size:20px;font-weight:700;">${total}</div>
                    <div style="opacity:.9;">สาขา</div>
                </div>
                <div style="flex:1;min-width:160px;background:linear-gradient(135deg,#2ecc71,#27ae60);color:#fff;padding:12px;border-radius:8px;text-align:center;">
                    <div style="font-size:12px;">สาขาที่ Online</div>
                    <div style="font-size:20px;font-weight:700;">${online}</div>
                    <div style="opacity:.9;">สาขา</div>
                </div>
                <div style="flex:1;min-width:160px;background:linear-gradient(135deg,#e74c4c,#c0392b);color:#fff;padding:12px;border-radius:8px;text-align:center;">
                    <div style="font-size:12px;">สาขาที่ Offline</div>
                    <div style="font-size:20px;font-weight:700;">${offline}</div>
                    <div style="opacity:.9;">สาขา</div>
                </div>
                <div style="flex:1;min-width:160px;background:linear-gradient(135deg,#9b59b6,#8e44ad);color:#fff;padding:12px;border-radius:8px;text-align:center;">
                    <div style="font-size:12px;">อัตราออนไลน์</div>
                    <div style="font-size:20px;font-weight:700;">${percent}</div>
                    <div style="opacity:.9;">เปอร์เซ็นต์</div>
                </div>
            </div>

            <div style="margin-top:10px;background:#fff;padding:10px;border-radius:8px;border-left:4px solid #2196f3;">
                <div style="font-weight:700;color:#1976d2;">📈 สถานะระบบ</div>
                <div style="margin-top:6px;">${(typeof getSystemStatusHTML === 'function') ? getSystemStatusHTML(percent) : ''}</div>
            </div>
        </div>

        <div style="margin-top:10px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#111827;border-bottom:1px solid #e8eef8;padding-bottom:6px;">📈 กราฟแสดงสถานะสาขา</div>
            <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e8eef8;text-align:center;">
                <img id="chartImage" src="" style="max-width:100%;height:auto;border-radius:6px;border:1px solid #eaeff6;" />
            </div>
        </div>

        <div style="margin-top:16px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#111827;border-bottom:1px solid #e8eef8;padding-bottom:6px;">📊 สรุปข้อมูลตามประเภทสาขา</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:220px;background:#fff;border-radius:8px;padding:12px;border-left:4px solid #3b82f6;">
                    <div style="font-weight:800;">CO (Company Owned)</div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">ทั้งหมด</div><div style="font-weight:700;">${branchTypeSummary.co.total}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Online</div><div style="font-weight:700;color:#16a34a;">${branchTypeSummary.co.online}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Offline</div><div style="font-weight:700;color:#dc2626;">${branchTypeSummary.co.offline}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Rate</div><div style="font-weight:700;color:#2563eb;">${branchTypeSummary.co.rate}</div></div>
                    </div>
                </div>

                <div style="flex:1;min-width:220px;background:#fff;border-radius:8px;padding:12px;border-left:4px solid #10b981;">
                    <div style="font-weight:800;">SBP (Sub Business Partner)</div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">ทั้งหมด</div><div style="font-weight:700;">${branchTypeSummary.sbp.total}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Online</div><div style="font-weight:700;color:#16a34a;">${branchTypeSummary.sbp.online}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Offline</div><div style="font-weight:700;color:#dc2626;">${branchTypeSummary.sbp.offline}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Rate</div><div style="font-weight:700;color:#2563eb;">${branchTypeSummary.sbp.rate}</div></div>
                    </div>
                </div>

                <div style="flex:1;min-width:220px;background:#fff;border-radius:8px;padding:12px;border-left:4px solid #f59e0b;">
                    <div style="font-weight:800;">Sub-Area (พื้นที่ย่อย)</div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">ทั้งหมด</div><div style="font-weight:700;">${branchTypeSummary.subArea.total}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Online</div><div style="font-weight:700;color:#16a34a;">${branchTypeSummary.subArea.online}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Offline</div><div style="font-weight:700;color:#dc2626;">${branchTypeSummary.subArea.offline}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Rate</div><div style="font-weight:700;color:#2563eb;">${branchTypeSummary.subArea.rate}</div></div>
                    </div>
                </div>

                <div style="flex:1;min-width:220px;background:#fff;border-radius:8px;padding:12px;border-left:4px solid #ef4444;">
                    <div style="font-weight:800;">ปตท (PTT Station)</div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">ทั้งหมด</div><div style="font-weight:700;">${branchTypeSummary.ptt.total}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Online</div><div style="font-weight:700;color:#16a34a;">${branchTypeSummary.ptt.online}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Offline</div><div style="font-weight:700;color:#dc2626;">${branchTypeSummary.ptt.offline}</div></div>
                        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Rate</div><div style="font-weight:700;color:#2563eb;">${branchTypeSummary.ptt.rate}</div></div>
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-top:20px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#111827;border-bottom:1px solid #e8eef8;padding-bottom:6px;">🌍 สรุปข้อมูลตามภาค</div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;">
                ${Object.entries(regionSummary).map(([region, data]) => `
                    <div style="flex:1 1 220px;background:#fff;border-radius:8px;padding:10px;border:1px solid #e8eef8;">
                        <div style="font-weight:700;margin-bottom:6px;">${region}</div>
                        <div style="font-size:12px;color:#374151;">สาขาทั้งหมด: <b>${data.total}</b></div>
                        <div style="font-size:12px;color:#16a34a;">Online: <b>${data.online}</b></div>
                        <div style="font-size:12px;color:#dc2626;">Offline: <b>${data.offline}</b></div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div style="margin-top:20px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#111827;border-bottom:1px solid #e8eef8;padding-bottom:6px;">📍 สรุปข้อมูลตามจังหวัด</div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;">
                ${Object.entries(provinceSummary).map(([prov, data]) => `
                    <div style="flex:1 1 220px;background:#fff;border-radius:8px;padding:10px;border:1px solid #e8eef8;">
                        <div style="font-weight:700;margin-bottom:6px;">${prov}</div>
                        <div style="font-size:12px;color:#374151;">สาขาทั้งหมด: <b>${data.total}</b></div>
                        <div style="font-size:12px;color:#16a34a;">Online: <b>${data.online}</b></div>
                        <div style="font-size:12px;color:#dc2626;">Offline: <b>${data.offline}</b></div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div style="margin-top:22px;padding-top:10px;border-top:1px solid #e8eef8;text-align:center;color:#6c757d;">
            <div style="font-size:12px;">สร้างเมื่อ: ${downloadDate} ${downloadTime}</div>
            <div style="font-size:12px;margin-top:6px;">Branch Management System</div>
        </div>
    `;

    tempContainer.innerHTML = mainContentHTML;

    // Attach chart image from existing canvas (if present)
    try {
        const chartCanvas = document.getElementById('statusChart') || document.querySelector('canvas[data-export-chart]') || document.querySelector('canvas[id*="chart" i]');
        if (chartCanvas) {
            const chartImg = tempContainer.querySelector('#chartImage');
            if (chartImg) {
                try {
                    chartImg.src = chartCanvas.toDataURL('image/png', 1.0);
                } catch (e) {
                    console.warn('chart canvas toDataURL failed:', e);
                }
            }
        } else {
            // no chart found -> remove chart section to save space
            const c = tempContainer.querySelector('#chartImage');
            if (c && c.parentElement) c.parentElement.parentElement.style.display = 'none';
        }
    } catch (e) {
        console.warn('chart handling error', e);
    }

    // Insert into DOM so html2canvas can render styles/fonts
    document.body.appendChild(tempContainer);

    // allow some time for fonts/images to load
    await new Promise(r => setTimeout(r, 300));

    // render with html2canvas at high scale for crisp text
    const canvas = await html2canvas(tempContainer, {
        scale: 2.0,
        useCORS: true,
        backgroundColor: '#f1f4f8',
        logging: false
    });

    // remove temp node
    document.body.removeChild(tempContainer);

    // Prepare slicing variables
    const pxPerMm = canvas.width / _PDF_PAGE.width; // pixels per mm on rendered canvas
    const printableHeightMm = _PDF_PAGE.height - _PDF_MARGINS.top - _PDF_MARGINS.bottom;
    const sliceHeightPx = Math.floor(printableHeightMm * pxPerMm);
    const imgWidthMm = _PDF_PAGE.width - _PDF_MARGINS.left - _PDF_MARGINS.right;

    // iterate slices
    let y = 0;
    let pageNum = 1;
    while (y < canvas.height) {
        const thisSliceHeight = Math.min(sliceHeightPx, canvas.height - y);
        // create slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = thisSliceHeight;
        const sctx = sliceCanvas.getContext('2d');
        // draw portion of original canvas onto slice canvas
        sctx.drawImage(canvas, 0, y, canvas.width, thisSliceHeight, 0, 0, canvas.width, thisSliceHeight);
        const imgData = sliceCanvas.toDataURL('image/png');

        // compute img height in mm
        const imgHeightMm = thisSliceHeight / pxPerMm;

        if (pageNum > 1) doc.addPage();

        // draw header and footer per page
        _drawHeader(doc, pageNum, _TOTAL_PAGES_PLACEHOLDER);
        // add image at left margin, top margin
        doc.addImage(imgData, 'PNG', _PDF_MARGINS.left, _PDF_MARGINS.top, imgWidthMm, imgHeightMm, undefined, 'FAST');
        _drawFooter(doc, pageNum, _TOTAL_PAGES_PLACEHOLDER);

        y += thisSliceHeight;
        pageNum++;
    }
}

// --------------------- Summary helpers (as provided originally) ---------------------
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
        const type = branch.status; // ใช้คอลัมน์ 'สถานะ' ตามที่ระบุ

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

    // คำนวณเปอร์เซ็นต์
    summary.co.rate = summary.co.total > 0 ? ((summary.co.online / summary.co.total) * 100).toFixed(2) + '%' : '0%';
    summary.sbp.rate = summary.sbp.total > 0 ? ((summary.sbp.online / summary.sbp.total) * 100).toFixed(2) + '%' : '0%';
    summary.subArea.rate = summary.subArea.total > 0 ? ((summary.subArea.online / summary.subArea.total) * 100).toFixed(2) + '%' : '0%';
    summary.ptt.rate = summary.ptt.total > 0 ? ((summary.ptt.online / summary.ptt.total) * 100).toFixed(2) + '%' : '0%';

    return summary;
}

function getDetailedSummaryData() {
    const regionSummary = {};
    const provinceSummary = {};

    // filteredBranches เป็น global variable จากไฟล์ app.js
    if (typeof filteredBranches === 'undefined') {
        console.error("filteredBranches is not defined. Cannot generate detailed summary.");
        return { regionSummary: {}, provinceSummary: {} };
    }

    filteredBranches.forEach(branch => {
        const isOnline = branch.onlineStatus === 'สามารถเชื่อม Online';

        // สรุปตามภาค
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

        // สรุปตามจังหวัด
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

// Helper function to generate system status HTML
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

// Expose PDF functions globally (so UI can call them)
window.exportPDFWithProgress = exportPDFWithProgress;
window.exportPDF = exportPDF;
