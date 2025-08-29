// assets/scripts/export.js

// REFACTORED: Export functions (excel)
function exportExcel(fileName) {
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
}

// REFACTORED: Export functions (csv)
function exportCSV(fileName) {
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
}
