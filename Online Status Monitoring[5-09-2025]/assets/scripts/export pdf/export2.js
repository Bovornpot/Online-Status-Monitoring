/* --------------------------------------------------------------
 * assets/scripts/export.js
 * Corporate-grade PDF/Excel/CSV exporter (A4, Header/Footer, Multi-page)
 * Dependencies expected on page:
 *   - window.jspdf (jsPDF v2+)
 *   - html2canvas (for crisp rasterization of complex Thai/HTML content)
 *   - XLSX (for Excel/CSV), optional
 *
 * Public API:
 *   - exportPDFWithProgress(fileName, options?)
 *   - exportPDF(fileName, options?)
 *   - exportExcel(fileName)
 *   - exportCSV(fileName)
 *
 * Notes:
 *   - This module renders rich HTML sections to PNG at high scale (2x) to ensure
 *     Thai text renders perfectly and remains crisp, while preserving a professional look.
 *   - Header/Footer are drawn natively in jsPDF (page number, date, and optional logo).
 *   - Cover page is generated separately (no header/footer).
 *   - Long content is sliced across pages with fixed margins.
 *   - Tables & graphs are included as HTML/images to ensure correct Thai rendering.
 * -------------------------------------------------------------- */
(function () {
  "use strict";

  // ---- Config (you can tweak these to fit your brand) -----------------------
  const THEME = {
    primary: "#0B5ED7",
    secondary: "#6C757D",
    success: "#16a34a",
    danger: "#dc2626",
    info: "#0dcaf0",
    light: "#f8f9fa",
    dark: "#212529",
    bg: "#F3F6FB",
    cardBg: "#FFFFFF",
    gradient: "linear-gradient(135deg, #0B5ED7 0%, #7A62FF 100%)",
  };

  // Page and layout (A4 in mm)
  const PAGE = {
    width: 210,
    height: 297,
  };
  const MARGINS = {
    top: 22,
    right: 12,
    bottom: 15,
    left: 12,
  };

  // Placeholder for total pages in jsPDF
  const TOTAL_PAGES_PLACEHOLDER = "{total_pages_count_string}";

  // Utility: Safe calls
  const safeCall = (fn, ...args) => {
    try {
      if (typeof fn === "function") return fn(...args);
    } catch (e) {
      console.error("Callback error:", e);
    }
  };

  // Utility: get Thai date/time strings
  function getNowStrings() {
    const now = new Date();
    const downloadDate = now.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    const downloadTime = now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return { now, downloadDate, downloadTime };
  }

  // Utility: locate a logo URL if available
  async function resolveLogoDataURL(options = {}) {
    const { logoUrl } = options;
    const fromDom =
      document.querySelector("#app-logo img") ||
      document.querySelector("img#app-logo") ||
      document.querySelector('img[alt*="logo" i]') ||
      null;
    const src = logoUrl || (fromDom ? fromDom.src : null);
    if (!src) return null;

    try {
      // make an HTMLImageElement and draw to canvas → dataURL
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      await img.decode();

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    } catch (e) {
      console.warn("Logo load failed, skipping logo in header:", e);
      return null;
    }
  }

  // Draw header (no Thai text to avoid font issues in jsPDF; use logo + English text)
  function drawHeader(doc, pageNumber, totalPagesText, options) {
    const title = (options && options.headerTitle) || "Online Status Report";
    const subtitle =
      (options && options.headerSubtitle) || "Branch Management System";

    // Header background line
    doc.setDrawColor(230);
    doc.setLineWidth(0.5);
    doc.line(MARGINS.left, MARGINS.top - 8, PAGE.width - MARGINS.right, MARGINS.top - 8);

    // Title
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, MARGINS.left, MARGINS.top - 11);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(subtitle, MARGINS.left, MARGINS.top - 3);
  }

  // Draw footer: page X of Y and timestamp
  function drawFooter(doc, pageNumber, totalPagesText, options) {
    const { downloadDate, downloadTime } = getNowStrings();
    const pageText = `Page ${pageNumber} of ${totalPagesText}`;

    // Footer line
    doc.setDrawColor(230);
    doc.setLineWidth(0.5);
    doc.line(MARGINS.left, PAGE.height - MARGINS.bottom + 4, PAGE.width - MARGINS.right, PAGE.height - MARGINS.bottom + 4);

    // Left: timestamp
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${downloadDate} ${downloadTime}`, MARGINS.left, PAGE.height - 6);

    // Right: page number
    const textWidth = doc.getTextWidth(pageText);
    doc.text(
      pageText,
      PAGE.width - MARGINS.right - textWidth,
      PAGE.height - 6
    );
  }

  // Render a DOM node to canvas with html2canvas at high scale
  async function renderNodeToCanvas(node, { scale = 2, backgroundColor = THEME.bg } = {}) {
    if (typeof html2canvas !== "function") {
      throw new Error("html2canvas is required but not found on window.");
    }
    return await html2canvas(node, {
      scale,
      useCORS: true,
      backgroundColor,
      logging: false,
      removeContainer: true,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
  }

  // Convert px width to mm width for jsPDF image scaling
  function mmImageHeightFor(doc, canvas, targetWidthMm) {
    const pxW = canvas.width;
    const pxH = canvas.height;
    const ratio = targetWidthMm / pxW;
    return pxH * ratio;
  }

  // Add a large canvas image to doc across multiple pages with margins and header/footer
  function addCanvasAcrossPages(doc, canvas, { skipHeaderFooterOnFirstPage = false } = {}) {
    const totalPagesText = TOTAL_PAGES_PLACEHOLDER;
    const imgData = canvas.toDataURL("image/png");
    const printableWidth = PAGE.width - MARGINS.left - MARGINS.right;
    const printableHeight = PAGE.height - MARGINS.top - MARGINS.bottom;
    const fullImgHeightMm = mmImageHeightFor(doc, canvas, printableWidth);

    let heightLeft = fullImgHeightMm;
    let pageIndex = 0;

    while (heightLeft > 0) {
      if (pageIndex > 0) doc.addPage("a4", "p");

      const pageNo = doc.getNumberOfPages();

      // header/footer
      if (!(skipHeaderFooterOnFirstPage && pageIndex === 0)) {
        drawHeader(doc, pageNo, totalPagesText, {});
      }

      // position for this page
      const position = MARGINS.top - pageIndex * printableHeight; // shift up to reveal next slice

      // draw image
      doc.addImage(
        imgData,
        "PNG",
        MARGINS.left,
        position,
        printableWidth,
        fullImgHeightMm,
        undefined,
        "FAST"
      );

      // footer on top (so it's not covered)
      if (!(skipHeaderFooterOnFirstPage && pageIndex === 0)) {
        drawFooter(doc, pageNo, totalPagesText, {});
      }

      heightLeft -= printableHeight;
      pageIndex++;
    }
  }

  // Build COVER PAGE (HTML → PNG) and add as first page (no header/footer)
  async function addCoverPage(doc, options = {}) {
    const { downloadDate, downloadTime } = getNowStrings();
    const cover = document.createElement("div");
    // A4 @ 96dpi → 794 x 1123 px
    cover.style.width = "794px";
    cover.style.height = "1123px";
    cover.style.display = "flex";
    cover.style.flexDirection = "column";
    cover.style.justifyContent = "space-between";
    cover.style.padding = "48px";
    cover.style.boxSizing = "border-box";
    cover.style.background = THEME.gradient;
    cover.style.color = "#fff";
    cover.style.fontFamily = '"TH Sarabun New", "Sarabun", Arial, sans-serif"';

    const top = document.createElement("div");
    top.style.display = "flex";
    top.style.alignItems = "center";
    top.style.justifyContent = "space-between";

    const titleWrap = document.createElement("div");
    const h1 = document.createElement("div");
    h1.style.fontSize = "36px";
    h1.style.fontWeight = "800";
    h1.style.letterSpacing = "0.3px";
    h1.style.marginBottom = "6px";
    h1.textContent = "รายงานสรุประบบจัดการข้อมูลสาขา";

    const h2 = document.createElement("div");
    h2.style.fontSize = "20px";
    h2.style.opacity = "0.95";
    h2.textContent = "Branch Management System – Online Status Monitoring";

    titleWrap.appendChild(h1);
    titleWrap.appendChild(h2);

    const logo = document.createElement("div");
    logo.style.width = "120px";
    logo.style.height = "120px";
    logo.style.borderRadius = "16px";
    logo.style.background = "rgba(255,255,255,0.15)";
    logo.style.display = "flex";
    logo.style.alignItems = "center";
    logo.style.justifyContent = "center";
    logo.style.fontWeight = "700";
    logo.style.backdropFilter = "blur(2px)";
    logo.textContent = "LOGO";

    top.appendChild(titleWrap);
    top.appendChild(logo);

    const mid = document.createElement("div");
    mid.style.background = "rgba(255,255,255,0.12)";
    mid.style.borderRadius = "16px";
    mid.style.padding = "24px";
    mid.style.lineHeight = "1.8";
    mid.style.fontSize = "18px";
    mid.innerHTML = `
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div><b>วันที่สร้างรายงาน</b></div>
          <div>${downloadDate}</div>
        </div>
        <div style="flex:1;min-width:240px;">
          <div><b>เวลา</b></div>
          <div>${downloadTime}</div>
        </div>
      </div>
    `;

    const bottom = document.createElement("div");
    bottom.style.display = "flex";
    bottom.style.alignItems = "center";
    bottom.style.justifyContent = "space-between";
    bottom.style.opacity = "0.95";
    bottom.style.fontSize = "16px";

    const dept = (options && options.footerLeft) || "Branch Management System";
    const ver = (options && options.footerRight) || "Confidential";

    const left = document.createElement("div");
    left.textContent = dept;

    const right = document.createElement("div");
    right.textContent = ver;

    bottom.appendChild(left);
    bottom.appendChild(right);

    cover.appendChild(top);
    cover.appendChild(mid);
    cover.appendChild(bottom);

    // Optional replace logo with real one
    const logoDataURL = await resolveLogoDataURL(options);
    if (logoDataURL) {
      logo.textContent = "";
      const img = new Image();
      img.src = logoDataURL;
      img.style.width = "80%";
      img.style.height = "80%";
      img.style.objectFit = "contain";
      img.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.25))";
      logo.appendChild(img);
    }

    document.body.appendChild(cover);
    const canvas = await renderNodeToCanvas(cover, { scale: 2 });
    document.body.removeChild(cover);

    const imgData = canvas.toDataURL("image/png");
    // Cover is always page 1; create fresh doc page if needed
    doc.addImage(imgData, "PNG", 0, 0, PAGE.width, PAGE.height, undefined, "FAST");
  }

  // Build the main report content as HTML (Summary, Charts, Region/Province tables)
  function buildReportContent(options = {}) {
    const { downloadDate, downloadTime } = getNowStrings();
    const container = document.createElement("div");
    container.style.width = "794px"; // A4 width @ 96dpi
    container.style.padding = "40px";
    container.style.boxSizing = "border-box";
    container.style.background = THEME.bg;
    container.style.fontFamily = '"TH Sarabun New", "Sarabun", Arial, sans-serif"';
    container.style.color = "#111827";

    // Summary cards from existing DOM numbers (fallback 0)
    const total = document.getElementById("totalBranches")?.textContent || "0";
    const online = document.getElementById("onlineBranches")?.textContent || "0";
    const offline = document.getElementById("offlineBranches")?.textContent || "0";
    const percent = document.getElementById("onlinePercentage")?.textContent || "0%";
    const { regionSummary, provinceSummary } = getDetailedSummaryData();
    const branchTypeSummary = getBranchTypeSummaryData();

    // Header banner (inside content)
    const header = document.createElement("div");
    header.style.textAlign = "center";
    header.style.marginBottom = "24px";
    header.style.padding = "20px";
    header.style.background = THEME.gradient;
    header.style.color = "#fff";
    header.style.borderRadius = "12px";
    header.innerHTML = `
      <div style="font-size:24px;font-weight:800;">รายงานสรุประบบจัดการข้อมูลสาขา</div>
      <div style="margin-top:6px;font-size:16px;opacity:0.95;">Branch Management System · Online Status</div>
    `;

    // Download info
    const meta = document.createElement("div");
    meta.style.marginBottom = "20px";
    meta.style.padding = "14px 16px";
    meta.style.background = "#fff";
    meta.style.border = "1px solid #e5e7eb";
    meta.style.borderLeft = `4px solid ${THEME.primary}`;
    meta.style.borderRadius = "10px";
    meta.innerHTML = `
      <div style="font-size:16px;font-weight:700;margin-bottom:6px;">📋 ข้อมูลการดาวน์โหลด</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;color:#374151;">
        <div><b>วันที่:</b> ${downloadDate}</div>
        <div><b>เวลา:</b> ${downloadTime}</div>
      </div>
    `;

    // Stat grid
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    grid.style.gap = "14px";
    grid.style.margin = "16px 0 4px";

    function statCard(title, value, subtitle, bgFrom, bgTo) {
      const card = document.createElement("div");
      card.style.background = `linear-gradient(135deg, ${bgFrom}, ${bgTo})`;
      card.style.color = "#fff";
      card.style.padding = "18px";
      card.style.borderRadius = "12px";
      card.style.textAlign = "center";
      card.innerHTML = `
        <div style="font-size:16px;margin-bottom:6px;">${title}</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:.5px;">${value}</div>
        <div style="opacity:.9;margin-top:4px;">${subtitle}</div>
      `;
      return card;
    }

    grid.appendChild(statCard("จำนวนสาขาทั้งหมด", total, "สาขา", "#3498db", "#2980b9"));
    grid.appendChild(statCard("สาขาที่ Online", online, "สาขา", "#2ecc71", "#27ae60"));
    grid.appendChild(statCard("สาขาที่ Offline", offline, "สาขา", "#e74c3c", "#c0392b"));
    grid.appendChild(statCard("อัตราออนไลน์", percent, "เปอร์เซ็นต์", "#9b59b6", "#8e44ad"));

    const systemStatus = document.createElement("div");
    systemStatus.style.background = "#fff";
    systemStatus.style.padding = "16px";
    systemStatus.style.borderRadius = "10px";
    systemStatus.style.borderLeft = "4px solid #2196f3";
    systemStatus.style.marginTop = "8px";
    systemStatus.innerHTML = `
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;">📈 สถานะระบบ</div>
      ${getSystemStatusHTML(percent)}
    `;

    // Chart section
    const chartWrap = document.createElement("div");
    chartWrap.style.marginTop = "24px";
    chartWrap.innerHTML = `
      <div style="font-size:18px;font-weight:800;color:#111827;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">📈 กราฟแสดงสถานะสาขา</div>
      <div style="background:#fff;padding:20px;border-radius:12px;border-left:4px solid #16a34a;margin-top:10px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04)">
        <img id="__report_chart_img" src="" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb"/>
      </div>
    `;

    // Try to extract an existing canvas chart
    const chartCanvas =
      document.getElementById("statusChart") ||
      document.querySelector("canvas[data-export-chart]") ||
      document.querySelector("canvas[id*='chart' i]");
    if (chartCanvas && chartWrap.querySelector("#__report_chart_img")) {
      try {
        const dataURL = chartCanvas.toDataURL("image/png", 1.0);
        chartWrap.querySelector("#__report_chart_img").src = dataURL;
      } catch (e) {
        console.warn("Unable to convert chart canvas to image:", e);
      }
    } else {
      // no chart found; hide wrapper
      chartWrap.style.display = "none";
    }

    // Branch type summary cards
    const typeWrap = document.createElement("div");
    typeWrap.style.marginTop = "24px";
    typeWrap.style.display = "grid";
    typeWrap.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
    typeWrap.style.gap = "16px";

    function typeCard(label, data, borderColor) {
      const card = document.createElement("div");
      card.style.background = "#fff";
      card.style.borderRadius = "12px";
      card.style.padding = "16px";
      card.style.borderLeft = `4px solid ${borderColor}`;
      card.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.04)";
      card.innerHTML = `
        <div style="font-size:16px;font-weight:800;margin-bottom:10px;color:#111827;">${label}</div>
        <div style="display:flex;gap:10px;justify-content:space-between;">
          <div style="text-align:center;flex:1;">
            <div style="font-size:12px;color:#6b7280;">ทั้งหมด</div>
            <div style="font-size:18px;font-weight:800;color:#111827;">${data.total}</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="font-size:12px;color:#6b7280;">Online</div>
            <div style="font-size:18px;font-weight:800;color:#16a34a;">${data.online}</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="font-size:12px;color:#6b7280;">Offline</div>
            <div style="font-size:18px;font-weight:800;color:#dc2626;">${data.offline}</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="font-size:12px;color:#6b7280;">Rate</div>
            <div style="font-size:18px;font-weight:800;color:#2563eb;">${data.rate}</div>
          </div>
        </div>
      `;
      return card;
    }

    const typesTitle = document.createElement("div");
    typesTitle.style.fontSize = "18px";
    typesTitle.style.fontWeight = "800";
    typesTitle.style.color = "#111827";
    typesTitle.style.borderBottom = "2px solid #e5e7eb";
    typesTitle.style.paddingBottom = "8px";
    typesTitle.textContent = "📊 สรุปข้อมูลตามประเภทสาขา";

    // Region summary
    const region = document.createElement("div");
    region.style.marginTop = "24px";
    region.innerHTML = `
      <div style="font-size:18px;font-weight:800;color:#111827;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">🌍 สรุปข้อมูลตามภาค</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;">
        ${Object.entries(regionSummary)
          .map(
            ([region, data]) => `
          <div style="flex:1 1 220px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
            <div style="font-weight:800;margin-bottom:6px;color:#111827;">${region}</div>
            <div style="font-size:12px;color:#374151;">สาขาทั้งหมด: <b>${data.total}</b></div>
            <div style="font-size:12px;color:#16a34a;">Online: <b>${data.online}</b></div>
            <div style="font-size:12px;color:#dc2626;">Offline: <b>${data.offline}</b></div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    // Province summary
    const province = document.createElement("div");
    province.style.marginTop = "24px";
    province.innerHTML = `
      <div style="font-size:18px;font-weight:800;color:#111827;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">📍 สรุปข้อมูลตามจังหวัด</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;">
        ${Object.entries(provinceSummary)
          .map(
            ([province, data]) => `
          <div style="flex:1 1 220px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
            <div style="font-weight:800;margin-bottom:6px;color:#111827;">${province}</div>
            <div style="font-size:12px;color:#374151;">สาขาทั้งหมด: <b>${data.total}</b></div>
            <div style="font-size:12px;color:#16a34a;">Online: <b>${data.online}</b></div>
            <div style="font-size:12px;color:#dc2626;">Offline: <b>${data.offline}</b></div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    container.appendChild(header);
    container.appendChild(meta);
    container.appendChild(grid);
    container.appendChild(systemStatus);
    container.appendChild(chartWrap);
    container.appendChild(typesTitle);
    // append cards
    typeWrap.appendChild(typeCard("CO (Company Owned)", branchTypeSummary.co, "#3b82f6"));
    typeWrap.appendChild(typeCard("SBP (Sub Business Partner)", branchTypeSummary.sbp, "#10b981"));
    typeWrap.appendChild(typeCard("Sub-Area (พื้นที่ย่อย)", branchTypeSummary.subArea, "#f59e0b"));
    typeWrap.appendChild(typeCard("ปตท (PTT Station)", branchTypeSummary.ptt, "#ef4444"));
    container.appendChild(typeWrap);
    container.appendChild(region);
    container.appendChild(province);

    return container;
  }

  // PUBLIC: Export PDF with a visible progress indicator (if host app provides UI hooks)
  async function exportPDFWithProgress(fileName, options = {}) {
    safeCall(window.showLoadingIndicator, "กำลังสร้างรายงาน PDF...");
    try {
      const result = await exportPDF(fileName, options);
      return result;
    } finally {
      safeCall(window.hideLoadingIndicator);
    }
  }

  // PUBLIC: Export PDF (main)
  async function exportPDF(fileName, options = {}) {
    safeCall(window.showLoadingIndicator, "กำลังสร้างรายงาน PDF...");
    const { jsPDF } = (window.jspdf || {});
    if (!jsPDF) {
      safeCall(window.showNotification, {
        type: "error",
        title: "ขาดไลบรารี",
        message: "ไม่พบ jsPDF ในหน้าเว็บ กรุณาโหลดสคริปต์ jsPDF ก่อนใช้งาน",
      });
      throw new Error("jsPDF is required but not found on window.jspdf");
    }

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const finalFileName = `${fileName || "Online_Status_Report"}.pdf`;

    try {
      // 1) COVER PAGE (no header/footer)
      await addCoverPage(doc, options);

      // 2) MAIN REPORT (with header/footer)
      const reportNode = buildReportContent(options);
      document.body.appendChild(reportNode);
      // small wait for images like chart <img> to load
      await new Promise((r) => setTimeout(r, 250));
      const reportCanvas = await renderNodeToCanvas(reportNode, { scale: 2 });
      document.body.removeChild(reportNode);

      // ensure new page for content (cover already used page 1)
      doc.addPage("a4", "p");
      addCanvasAcrossPages(doc, reportCanvas, { skipHeaderFooterOnFirstPage: false });

      // Total pages replacement
      doc.putTotalPages(TOTAL_PAGES_PLACEHOLDER);

      // Save
      doc.save(finalFileName);

      safeCall(window.logActivity, "EXPORT PDF", `ส่งออกรายงาน PDF: ${finalFileName}`);
      safeCall(window.showNotification, {
        type: "success",
        title: "ส่งออกสำเร็จ",
        message: `บันทึกรายงาน PDF เรียบร้อย: ${finalFileName}`,
      });

      return { success: true, fileName: finalFileName };
    } catch (error) {
      console.error("Failed to export PDF:", error);
      safeCall(window.showNotification, {
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message: `ไม่สามารถส่งออก PDF ได้: ${error.message}`,
      });
      return { success: false, error: error.message };
    } finally {
      safeCall(window.hideLoadingIndicator);
    }
  }

  // ---------------- Excel & CSV (kept compatible with your original API) ----
  function exportExcel(fileName) {
    try {
      if (!window.XLSX) throw new Error("XLSX library is required for Excel export.");

      if (!Array.isArray(window.allBranches) || window.allBranches.length === 0) {
        safeCall(window.showNotification, { type: "error", title: "ไม่มีข้อมูล", message: "ไม่มีข้อมูลสำหรับส่งออก" });
        return;
      }
      const headers = [
        "รหัสร้าน", "ชื่อสาขา", "ภาค", "สถานะ", "สถานะเชื่อมOnline", "เครื่องบันทึกภาพ",
        "ยี่ห้อ", "อำเภอ", "จังหวัด", "เบอร์โทรร้าน", "FC.", "เบอร์โทร Hybrid FC",
        "เขต", "เบอร์โทร Hybrid เขต", "ฝ่าย", "เบอร์โทร Hybrid ฝ่าย", "GM.",
        "เบอร์โทร Hybrid GM", "AVP", "เบอร์โทร Hybrid AVP"
      ];
      const dataToExport = window.allBranches.map(b => [
        b.storeCode, b.branchName, b.region, b.status, b.onlineStatus, b.recorder,
        b.brand, b.district, b.province, b.phone, b.fc, b.phone_fc, b.zone,
        b.phone_zone, b.department, b.phone_dept, b.gm, b.phone_gm, b.avp, b.phone_avp
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Branch Data");
      safeCall(window.logActivity, "EXPORT EXCEL", `ส่งออกข้อมูลเป็น Excel ชื่อไฟล์ ${fileName}.xlsx`);
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      safeCall(window.showNotification, { type: "success", title: "สำเร็จ", message: `บันทึก Excel เรียบร้อย: ${fileName}.xlsx` });
    } catch (error) {
      console.error("Failed to export Excel:", error);
      safeCall(window.showNotification, { type: "error", title: "ผิดพลาด", message: "ไม่สามารถส่งออก .xlsx ได้" });
    }
  }

  function exportCSV(fileName) {
    try {
      if (!Array.isArray(window.allBranches) || window.allBranches.length === 0) {
        safeCall(window.showNotification, { type: "error", title: "ไม่มีข้อมูล", message: "ไม่มีข้อมูลสำหรับส่งออก" });
        return;
      }
      const headers = [
        "รหัสร้าน", "ชื่อสาขา", "ภาค", "สถานะ", "สถานะเชื่อมOnline", "เครื่องบันทึกภาพ",
        "ยี่ห้อ", "อำเภอ", "จังหวัด", "เบอร์โทรร้าน", "FC.", "เบอร์โทร Hybrid FC",
        "เขต", "เบอร์โทร Hybrid เขต", "ฝ่าย", "เบอร์โทร Hybrid ฝ่าย", "GM.",
        "เบอร์โทร Hybrid GM", "AVP", "เบอร์โทร Hybrid AVP"
      ];
      const dataToExport = window.allBranches.map(b => [
        b.storeCode, b.branchName, b.region, b.status, b.onlineStatus, b.recorder,
        b.brand, b.district, b.province, b.phone, b.fc, b.phone_fc, b.zone,
        b.phone_zone, b.department, b.phone_dept, b.gm, b.phone_gm, b.avp, b.phone_avp
      ]);

      let csvContent = headers.join(",") + "\n";
      dataToExport.forEach(row => {
        csvContent += row.map(field => `"${String(field ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
      });

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      safeCall(window.logActivity, "EXPORT CSV", `ส่งออกข้อมูลเป็น CSV ชื่อไฟล์ ${fileName}.csv`);
      link.click();
      URL.revokeObjectURL(link.href);
      safeCall(window.showNotification, { type: "success", title: "สำเร็จ", message: `บันทึก CSV เรียบร้อย: ${fileName}.csv` });
    } catch (error) {
      console.error("Failed to export CSV:", error);
      safeCall(window.showNotification, { type: "error", title: "ผิดพลาด", message: "ไม่สามารถส่งออก .csv ได้" });
    }
  }

  // -------------------- Summary helpers (from your original logic) ----------
  function getBranchTypeSummaryData() {
    const summary = {
      co: { total: 0, online: 0, offline: 0, rate: "0%" },
      sbp: { total: 0, online: 0, offline: 0, rate: "0%" },
      subArea: { total: 0, online: 0, offline: 0, rate: "0%" },
      ptt: { total: 0, online: 0, offline: 0, rate: "0%" },
    };

    if (typeof window.filteredBranches === "undefined" || !Array.isArray(window.filteredBranches)) {
      console.warn("filteredBranches is not defined. Cannot generate branch type summary.");
      return summary;
    }

    window.filteredBranches.forEach((branch) => {
      const isOnline = branch.onlineStatus === "สามารถเชื่อม Online";
      const type = branch.status;

      if (type === "CO") {
        summary.co.total++;
        isOnline ? summary.co.online++ : summary.co.offline++;
      } else if (type === "SBP") {
        summary.sbp.total++;
        isOnline ? summary.sbp.online++ : summary.sbp.offline++;
      } else if (type === "Sub-Area") {
        summary.subArea.total++;
        isOnline ? summary.subArea.online++ : summary.subArea.offline++;
      } else if (type === "ปตท") {
        summary.ptt.total++;
        isOnline ? summary.ptt.online++ : summary.ptt.offline++;
      }
    });

    // rates
    const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(2) + "%" : "0%");
    summary.co.rate = pct(summary.co.online, summary.co.total);
    summary.sbp.rate = pct(summary.sbp.online, summary.sbp.total);
    summary.subArea.rate = pct(summary.subArea.online, summary.subArea.total);
    summary.ptt.rate = pct(summary.ptt.online, summary.ptt.total);

    return summary;
  }

  function getDetailedSummaryData() {
    const regionSummary = {};
    const provinceSummary = {};

    if (typeof window.filteredBranches === "undefined" || !Array.isArray(window.filteredBranches)) {
      console.warn("filteredBranches is not defined. Cannot generate detailed summary.");
      return { regionSummary: {}, provinceSummary: {} };
    }

    window.filteredBranches.forEach((branch) => {
      const isOnline = branch.onlineStatus === "สามารถเชื่อม Online";

      // region
      if (branch.region) {
        if (!regionSummary[branch.region]) {
          regionSummary[branch.region] = { total: 0, online: 0, offline: 0 };
        }
        regionSummary[branch.region].total++;
        isOnline ? regionSummary[branch.region].online++ : regionSummary[branch.region].offline++;
      }

      // province
      if (branch.province) {
        if (!provinceSummary[branch.province]) {
          provinceSummary[branch.province] = { total: 0, online: 0, offline: 0 };
        }
        provinceSummary[branch.province].total++;
        isOnline ? provinceSummary[branch.province].online++ : provinceSummary[branch.province].offline++;
      }
    });

    return { regionSummary, provinceSummary };
  }

  function getSystemStatusHTML(percent) {
    const onlineRate = parseFloat(String(percent).replace("%", ""));
    if (onlineRate >= 95) {
      return `<div style="color:#2e7d32;font-size:14px;"><span style="font-size:18px;">🟢</span><b> สถานะระบบ: ดีเยี่ยม</b><div style="margin-top:4px;">ระบบทำงานได้อย่างมีประสิทธิภาพสูง</div></div>`;
    } else if (onlineRate >= 80) {
      return `<div style="color:#f57c00;font-size:14px;"><span style="font-size:18px;">🟡</span><b> สถานะระบบ: ดี</b><div style="margin-top:4px;">ระบบทำงานในระดับที่ยอมรับได้</div></div>`;
    } else {
      return `<div style="color:#d32f2f;font-size:14px;"><span style="font-size:18px;">🔴</span><b> สถานะระบบ: ต้องปรับปรุง</b><div style="margin-top:4px;">ควรตรวจสอบสาขาที่ออฟไลน์</div></div>`;
    }
  }

  // -------------------- Expose to window ------------------------------------
  window.exportPDFWithProgress = exportPDFWithProgress;
  window.exportPDF = exportPDF;
  window.exportExcel = exportExcel;
  window.exportCSV = exportCSV;
  // Keep helper exports in case other modules want to reuse
  window.getBranchTypeSummaryData = window.getBranchTypeSummaryData || getBranchTypeSummaryData;
  window.getDetailedSummaryData = window.getDetailedSummaryData || getDetailedSummaryData;
  window.getSystemStatusHTML = window.getSystemStatusHTML || getSystemStatusHTML;
})();