// assets/scripts/export.js

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

// Main export function with progress
async function exportPDFWithProgress(fileName) {
    if (typeof showLoadingIndicator === 'function') {
        showLoadingIndicator('กำลังสร้างรายงาน PDF...');
    }

    try {
        const result = await exportPDF(fileName);
        return result;
    } finally {
        if (typeof hideLoadingIndicator === 'function') {
            hideLoadingIndicator();
        }
    }
}

// ฟังก์ชันหลักสำหรับส่งออก PDF
async function exportPDF(fileName) {
    if (typeof showLoadingIndicator === 'function') {
        showLoadingIndicator('กำลังสร้างรายงาน PDF...');
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
        const finalFileName = `${fileName || 'Online_Status_Report'}.pdf`;

        await addHeaderAndSummaryToPdf(doc);

        doc.save(finalFileName);

        if (typeof logActivity === 'function') {
            logActivity('EXPORT PDF', `ส่งออกรายงาน PDF: ${finalFileName}`);
        }
        if (typeof showNotification === 'function') {
            showNotification({
                type: "success",
                title: "ส่งออกสำเร็จ",
                message: `บันทึกรายงาน PDF เรียบร้อย: ${finalFileName}`
            });
        }
        return { success: true, fileName: finalFileName };

    } catch (error) {
        console.error("Failed to export PDF:", error);
        if (typeof showNotification === 'function') {
            showNotification({
                type: 'error',
                title: 'เกิดข้อผิดพลาด',
                message: `ไม่สามารถส่งออก PDF ได้: ${error.message}`
            });
        }
        return { success: false, error: error.message };
    } finally {
        if (typeof hideLoadingIndicator === 'function') {
            hideLoadingIndicator();
        }
    }
}

// ฟังก์ชันสำหรับเพิ่มส่วนหัว, สถิติ, และกราฟลงใน PDF
async function addHeaderAndSummaryToPdf(doc) {
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '794px';
    tempContainer.style.fontFamily = '"TH Sarabun New", "Sarabun", Arial, sans-serif';
    tempContainer.style.padding = '40px';
    tempContainer.style.backgroundColor = '#f1f4f8';

    const now = new Date();
    const downloadDate = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const downloadTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const total = document.getElementById("totalBranches")?.textContent || "0";
    const online = document.getElementById("onlineBranches")?.textContent || "0";
    const offline = document.getElementById("offlineBranches")?.textContent || "0";
    const percent = document.getElementById("onlinePercentage")?.textContent || "0%";
    
    const { regionSummary, provinceSummary } = getDetailedSummaryData();
    const branchTypeSummary = getBranchTypeSummaryData();

    // ส่วนหัว, ข้อมูลดาวน์โหลด, สรุปภาพรวม, และสถานะระบบ
    let mainContentHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">รายงานสรุประบบจัดการข้อมูลสาขา</h1>
            <h2 style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Branch Management System - Online Status Monitoring</h2>
        </div>
        <div style="margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #495057;">📋 ข้อมูลการดาวน์โหลด</h3>
            <p style="margin: 5px 0; color: #6c757d;"><strong>วันที่:</strong> ${downloadDate}</p>
            <p style="margin: 5px 0; color: #6c757d;"><strong>เวลา:</strong> ${downloadTime}</p>
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
                ${getSystemStatusHTML(percent)}
            </div>
        </div>
    `;

    tempContainer.innerHTML = mainContentHTML;
    
    // NEW: เพิ่มส่วนของกราฟ
    const chartDiv = document.createElement('div');
    chartDiv.style.marginTop = '30px';
    chartDiv.innerHTML = `
        <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">📈 กราฟแสดงสถานะสาขา</h3>
        <div style="background: #fdfdfd; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #2ecc71; text-align: center;">
            <img id="chartImage" src="" style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
        </div>
    `;
    tempContainer.appendChild(chartDiv);

    // NEW: เพิ่ม Summary Card ที่มีหน้าตาเหมือนในเว็บ
    // NEW: เพิ่ม Summary Card ที่มีหน้าตาเหมือนในเว็บ
    const chartSummaryDiv = document.createElement('div');
    chartSummaryDiv.classList.add('chart-summary');
    chartSummaryDiv.id = 'statusSummaryContainer';
    chartSummaryDiv.style.marginTop = '30px';
    chartSummaryDiv.style.display = 'grid';
    chartSummaryDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
    chartSummaryDiv.style.gap = '20px';
    chartSummaryDiv.innerHTML = `
        <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; grid-column: 1 / -1;">📊 สรุปข้อมูลตามประเภทสาขา</h3>
        
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
    tempContainer.appendChild(chartSummaryDiv);

    // เพิ่มส่วนสรุปตามภาค
    const regionSummaryDiv = document.createElement('div');
    regionSummaryDiv.style.marginTop = '30px';
    regionSummaryDiv.innerHTML = `
        <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">🌍 สรุปข้อมูลตามภาค</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0;">
            ${Object.entries(regionSummary).map(([region, data]) => `
                <div style="flex: 1 1 200px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fdfdfd; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
                    <p style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #333;">${region}</p>
                    <p style="font-size: 12px; color: #555;">สาขาทั้งหมด: <span style="font-weight: bold;">${data.total}</span></p>
                    <p style="font-size: 12px; color: #28a745;">Online: <span style="font-weight: bold;">${data.online}</span></p>
                    <p style="font-size: 12px; color: #dc3545;">Offline: <span style="font-weight: bold;">${data.offline}</span></p>
                </div>
            `).join('')}
        </div>
    `;
    tempContainer.appendChild(regionSummaryDiv);

    // เพิ่มส่วนสรุปตามจังหวัด
    const provinceSummaryDiv = document.createElement('div');
    provinceSummaryDiv.style.marginTop = '30px';
    provinceSummaryDiv.innerHTML = `
        <h3 style="color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">📍 สรุปข้อมูลตามจังหวัด</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0;">
            ${Object.entries(provinceSummary).map(([province, data]) => `
                <div style="flex: 1 1 200px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fdfdfd; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
                    <p style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #333;">${province}</p>
                    <p style="font-size: 12px; color: #555;">สาขาทั้งหมด: <span style="font-weight: bold;">${data.total}</span></p>
                    <p style="font-size: 12px; color: #28a745;">Online: <span style="font-weight: bold;">${data.online}</span></p>
                    <p style="font-size: 12px; color: #dc3545;">Offline: <span style="font-weight: bold;">${data.offline}</span></p>
                </div>
            `).join('')}
        </div>
    `;
    tempContainer.appendChild(provinceSummaryDiv);

    // เพิ่ม footer
    const footerDiv = document.createElement('div');
    footerDiv.style.marginTop = '40px';
    footerDiv.style.padding = '20px';
    footerDiv.style.borderTop = '2px solid #dee2e6';
    footerDiv.style.textAlign = 'center';
    footerDiv.style.color = '#6c757d';
    footerDiv.innerHTML = `
        <p style="margin: 0; font-size: 12px;">สร้างเมื่อ: ${downloadDate} ${downloadTime}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px;">Branch Management System</p>
    `;
    tempContainer.appendChild(footerDiv);

    document.body.appendChild(tempContainer);

    const chartCanvas = document.getElementById("statusChart");
    if (chartCanvas) {
        document.getElementById("chartImage").src = chartCanvas.toDataURL('image/png');
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(tempContainer, {
        scale: 2.0,
        useCORS: true,
        backgroundColor: '#f1f4f8'
    });

    document.body.removeChild(tempContainer);

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }
}

// NEW: ฟังก์ชันสำหรับคำนวณข้อมูลสรุปตามประเภทสาขา
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

// ฟังก์ชันสำหรับคำนวณสรุปข้อมูลตามภาคและจังหวัด
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

// ฟังก์ชันสำหรับส่งออก Excel และ CSV (ยังคงเดิม)
function exportExcel(fileName) { /* โค้ดเดิม... */ }
function exportCsv(fileName) { /* โค้ดเดิม... */ }


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