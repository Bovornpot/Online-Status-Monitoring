// assets/scripts/export.js
// Improved PDF export (focused only on PDF layout per user request)
// Dependencies required on page:
//  - jsPDF (window.jspdf.jsPDF)
//  - html2canvas (window.html2canvas)
//
// Layout requested:
// Page 1: รายงานสรุป + ข้อมูลการดาวน์โหลด + สรุปภาพรวม + สถานะระบบ
// Page 2: กราฟแสดงสถานะสาขา + สรุปข้อมูลตามประเภทสาขา
// Page 3: สรุปข้อมูลตามภาค
// Page 4...: สรุปข้อมูลตามจังหวัด (หลายหน้าอัตโนมัติ)
//
// This file preserves your original helper functions (getDetailedSummaryData, getBranchTypeSummaryData etc.)
// and leaves Excel/CSV exports untouched (no changes to exportExcel/exportCSV behavior).

// ----------------------------- Constants & Helpers -----------------------------
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
  return {
    now,
    date: now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
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
  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const pageText = `หน้า ${pageNumber}${totalPagesText ? ' / ' + totalPagesText : ''}`;

  doc.setDrawColor(220);
  doc.setLineWidth(0.4);
  doc.line(_MARGIN_MM.left, _PDF_MM.height - _MARGIN_MM.bottom + 6, _PDF_MM.width - _MARGIN_MM.right, _PDF_MM.height - _MARGIN_MM.bottom + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`${dateStr} ${timeStr}`, _MARGIN_MM.left, _PDF_MM.height - _MARGIN_MM.bottom + 12);

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

  // content area inside page (reserves header/footer spaces)
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

// Build page 1: summary (download info, overview cards, system status)
function _buildPage1({ total, online, offline, percent, downloadDate, downloadTime, systemHtml }) {
  const { page, content } = _createPageDiv();

  // Header block inside content
  const header = document.createElement('div');
  header.style.textAlign = 'center';
  header.style.marginBottom = '14px';
  header.innerHTML = `
    <div style="font-size:20px;font-weight:700;color:#0b3b8c;">รายงานสรุประบบจัดการข้อมูลสาขา</div>
    <div style="font-size:12px;color:#334155;margin-top:6px;">Branch Management System - Online Status Monitoring</div>
  `;
  content.appendChild(header);

  // Download info card
  const meta = document.createElement('div');
  meta.style.background = '#fff';
  meta.style.padding = '10px';
  meta.style.border = '1px solid #e6eef8';
  meta.style.borderLeft = '4px solid #0b5ed7';
  meta.style.borderRadius = '8px';
  meta.style.marginBottom = '12px';
  meta.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;">📋 ข้อมูลการดาวน์โหลด</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;color:#475569;">
      <div><b>วันที่:</b> ${downloadDate}</div>
      <div><b>เวลา:</b> ${downloadTime}</div>
    </div>
  `;
  content.appendChild(meta);

  // Overview grid
  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.gap = '10px';
  grid.style.flexWrap = 'wrap';
  grid.style.marginBottom = '12px';

  function _card(title, value, bgFrom, bgTo) {
    const c = document.createElement('div');
    c.style.flex = '1 1 160px';
    c.style.minWidth = '160px';
    c.style.background = `linear-gradient(135deg, ${bgFrom}, ${bgTo})`;
    c.style.color = '#fff';
    c.style.padding = '12px';
    c.style.borderRadius = '8px';
    c.style.textAlign = 'center';
    c.innerHTML = `<div style="font-size:12px;">${title}</div><div style="font-size:20px;font-weight:700;">${value}</div><div style="opacity:0.9;">สาขา</div>`;
    return c;
  }
  grid.appendChild(_card('จำนวนสาขาทั้งหมด', total, '#3498db', '#2980b9'));
  grid.appendChild(_card('สาขาที่ Online', online, '#2ecc71', '#27ae60'));
  grid.appendChild(_card('สาขาที่ Offline', offline, '#e74c4c', '#c0392b'));
  grid.appendChild(_card('อัตราออนไลน์', percent, '#9b59b6', '#8e44ad'));
  content.appendChild(grid);

  // System status
  const statusWrap = document.createElement('div');
  statusWrap.style.background = '#fff';
  statusWrap.style.padding = '12px';
  statusWrap.style.borderRadius = '8px';
  statusWrap.style.borderLeft = '4px solid #2196f3';
  statusWrap.innerHTML = `<div style="font-weight:700;color:#1976d2;margin-bottom:6px;">📈 สถานะระบบ</div><div>${systemHtml}</div>`;
  content.appendChild(statusWrap);

  return page;
}

// Build page 2: chart and branch-type summary
function _buildPage2({ chartDataUrl, branchTypeSummary }) {
  const { page, content } = _createPageDiv();

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.fontSize = '14px';
  title.style.marginBottom = '8px';
  title.textContent = '📈 กราฟแสดงสถานะสาขา';
  content.appendChild(title);

  const chartWrap = document.createElement('div');
  chartWrap.style.background = '#fff';
  chartWrap.style.padding = '10px';
  chartWrap.style.border = '1px solid #e8eef8';
  chartWrap.style.borderRadius = '8px';
  chartWrap.style.textAlign = 'center';
  chartWrap.style.marginBottom = '12px';
  const img = document.createElement('img');
  img.id = 'report_chart_img';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.borderRadius = '6px';
  img.style.border = '1px solid #eaeff6';
  if (chartDataUrl) img.src = chartDataUrl; else img.style.display = 'none';
  chartWrap.appendChild(img);
  content.appendChild(chartWrap);

  const typesTitle = document.createElement('div');
  typesTitle.style.fontWeight = '700';
  typesTitle.style.marginBottom = '8px';
  typesTitle.textContent = '📊 สรุปข้อมูลตามประเภทสาขา';
  content.appendChild(typesTitle);

  const typesGrid = document.createElement('div');
  typesGrid.style.display = 'flex';
  typesGrid.style.gap = '10px';
  typesGrid.style.flexWrap = 'wrap';

  function _typeCard(label, data, color) {
    const c = document.createElement('div');
    c.style.flex = '1 1 220px';
    c.style.minWidth = '220px';
    c.style.background = '#fff';
    c.style.borderRadius = '8px';
    c.style.padding = '10px';
    c.style.borderLeft = `4px solid ${color}`;
    c.innerHTML = `<div style="font-weight:800;">${label}</div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">ทั้งหมด</div><div style="font-weight:700;">${data.total}</div></div>
        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Online</div><div style="font-weight:700;color:#16a34a;">${data.online}</div></div>
        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Offline</div><div style="font-weight:700;color:#dc2626;">${data.offline}</div></div>
        <div style="flex:1;text-align:center;"><div style="font-size:12px;color:#6b7280;">Rate</div><div style="font-weight:700;color:#2563eb;">${data.rate}</div></div>
      </div>`;
    return c;
  }

  typesGrid.appendChild(_typeCard('CO (Company Owned)', branchTypeSummary.co, '#3b82f6'));
  typesGrid.appendChild(_typeCard('SBP (Sub Business Partner)', branchTypeSummary.sbp, '#10b981'));
  typesGrid.appendChild(_typeCard('Sub-Area (พื้นที่ย่อย)', branchTypeSummary.subArea, '#f59e0b'));
  typesGrid.appendChild(_typeCard('ปตท (PTT Station)', branchTypeSummary.ptt, '#ef4444'));

  content.appendChild(typesGrid);

  return page;
}

// Build region pages (try to fit up to N cards per page)
function _buildRegionPages(regionSummary) {
  const entries = Object.entries(regionSummary || {});
  if (entries.length === 0) {
    // empty region page placeholder
    const { page } = _createPageDiv();
    const content = page.firstChild;
    const n = document.createElement('div');
    n.style.color = '#6b7280';
    n.textContent = 'ไม่มีข้อมูลสรุปตามภาค';
    content.appendChild(n);
    return [page];
  }
  const perPage = 6; // 3 columns x 2 rows
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
  const perPage = 8; // 2 columns x 4 rows suggested
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
      card.style.flex = '1 1 calc(50% - 10px)'; // two columns
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
    const branchTypeSummary = (typeof getBranchTypeSummaryData === 'function') ? getBranchTypeSummaryData() : { co:{total:0,online:0,offline:0,rate:'0%'}, sbp:{total:0,online:0,offline:0,rate:'0%'}, subArea:{total:0,online:0,offline:0,rate:'0%'}, ptt:{total:0,online:0,offline:0,rate:'0%'} };
    const detailed = (typeof getDetailedSummaryData === 'function') ? getDetailedSummaryData() : { regionSummary:{}, provinceSummary:{} };
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
    // Page 3(s) Region summary -> try to keep to one but will split if many
    const regionPages = _buildRegionPages(detailed.regionSummary);
    pages.push(...regionPages);
    // Page 4+ Province summary chunked
    const provincePages = _buildProvincePages(detailed.provinceSummary);
    pages.push(...provincePages);

    // Create jsPDF doc and add each rendered page as image with header/footer
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    let pageIndex = 0;
    for (const pageNode of pages) {
      // Attach to DOM, render, remove
      document.body.appendChild(pageNode);
      // allow render
      // short delay to ensure images/fonts loaded
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 150));
      // render with scale 2 for crispness
      // eslint-disable-next-line no-await-in-loop
      const canvas = await _renderNodeToCanvas(pageNode, { scale: 2, backgroundColor: '#f1f4f8' });
      document.body.removeChild(pageNode);

      const imgData = canvas.toDataURL('image/png');
      // mm conversion: canvas.width px corresponds to _PDF_MM.width mm (because we used full A4 px)
      const pxPerMm = canvas.width / _PDF_MM.width;
      const imgHeightMm = canvas.height / pxPerMm;
      const imgWidthMm = _PDF_MM.width; // full width, we will position with margins

      if (pageIndex > 0) doc.addPage();
      // draw header + image + footer
      const currentPageNumber = pageIndex + 1;
      _drawHeader(doc, currentPageNumber, _TOTAL_PAGES_PLACEHOLDER);
      // add image starting at left margin and top margin
      const x = 0; // use full width so it matches our design
      const y = 0; // place at top (header is drawn above but our page content reserved space)
      // scale image to full page width mm
      doc.addImage(imgData, 'PNG', x, y, imgWidthMm, imgHeightMm, undefined, 'FAST');
      _drawFooter(doc, currentPageNumber, _TOTAL_PAGES_PLACEHOLDER);

      pageIndex++;
    }

    // Try to replace total pages placeholder if possible
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

// REFACTORED: Export functions (excel)
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

// REFACTORED: Export functions (csv)
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
