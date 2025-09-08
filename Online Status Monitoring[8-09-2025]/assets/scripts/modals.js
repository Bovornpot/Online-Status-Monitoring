// assets/scripts/modals.js

// ฟังก์ชันสำหรับเปิดและแสดงข้อมูลใน Details Modal
async function openDetailsModal(id) {
    // กันเคส data-id="" หรือ undefined
    if (id === undefined || id === null || id === '' || Number.isNaN(Number(id))) {
        await showNotification({ type: 'error', title: 'ผิดพลาด', message: 'ID ไม่ถูกต้อง' });
        return;
    }
    id = Number(id);

    const branch = await db.branches.get(id);
    if (!branch) {
        await showNotification({ type: 'error', title: 'ผิดพลาด', message: 'ไม่พบข้อมูลสาขา' });
        return;
    }

    // สร้าง Label ที่จะแสดงผลให้สวยงาม
    const fieldLabels = {
        storeCode: 'รหัสร้าน', branchName: 'ชื่อสาขา', region: 'ภาค',
        status: 'สถานะ', onlineStatus: 'สถานะเชื่อมOnline', recorder: 'เครื่องบันทึกภาพ',
        brand: 'ยี่ห้อ', district: 'อำเภอ', province: 'จังหวัด',
        phone: 'เบอร์โทรร้าน', fc: 'FC.', phone_fc: 'เบอร์โทร Hybrid FC',
        zone: 'เขต', phone_zone: 'เบอร์โทร Hybrid เขต', department: 'ฝ่าย',
        phone_dept: 'เบอร์โทร Hybrid ฝ่าย', gm: 'GM.', phone_gm: 'เบอร์โทร Hybrid GM',
        avp: 'AVP', phone_avp: 'เบอร์โทร Hybrid AVP'
    };

    let detailsHtml = '<div class="details-grid" id="detailsGrid">';
    for (const key in fieldLabels) {
        detailsHtml += `
            <div class="details-label">${fieldLabels[key]}:</div>
            <div class="details-value">${branch[key] || '-'}</div>
        `;
    }
    detailsHtml += '</div>';

    DOMElements.detailsModalBody.innerHTML = detailsHtml;
    
    // เก็บ id ของสาขาไว้กับ Modal เพื่อให้ปุ่ม แก้ไข/ลบ รู้ว่าต้องทำงานกับใคร
    DOMElements.detailsModal.dataset.branchId = id;
    
    DOMElements.detailsModal.style.display = 'block';
}

// ฟังก์ชันสำหรับปิด Details Modal
function closeDetailsModal() {
    DOMElements.detailsModal.style.display = 'none';
    DOMElements.detailsModal.dataset.branchId = ''; // ล้าง id ที่เก็บไว้ออก
}

// ฟังก์ชันสำหรับเปิด Export Modal
function openExportModal(type) {
    if (allBranches.length === 0) {
        showNotification({ type: 'error', title: 'ไม่มีข้อมูล', message: 'ไม่มีข้อมูลสำหรับส่งออก' });
        return;
    }
    exportType = type;
    const now = new Date();
    const fileName = `branch_data_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    let fileExtension = '';
    if (type === 'excel') {
        fileExtension = '.xlsx';
    } else if (type === 'csv') {
        fileExtension = '.csv';
    } else if (type === 'pdf') {
        fileExtension = '.pdf'; // NEW
    }
    DOMElements.exportFileName.value = fileName;
    DOMElements.exportForm.querySelector('small').textContent = `ไฟล์จะถูกบันทึกเป็น: ${fileName}${fileExtension}`;
    DOMElements.exportModal.style.display = 'block';
}

// ... ส่วนอื่นๆ ของ modals.js

// ฟังก์ชันสำหรับปิด Export Modal
function closeExportModal() {
    DOMElements.exportModal.style.display = 'none';
    exportType = null; // รีเซ็ตค่า
    DOMElements.exportForm.reset(); // ล้างค่าในฟอร์ม
}

// ฟังก์ชันสำหรับซ่อน Notification Modal
function hideNotification() {
    DOMElements.notificationModal.style.display = 'none';
}

// ฟังก์ชันอัจฉริยะสำหรับแสดง Notification Modal ในสถานะต่างๆ
function showNotification({ type, title, message }) {
    return new Promise((resolve) => {
        const { notificationIcon, notificationTitle, notificationMessage, notificationActions, notificationModal } = DOMElements;

        // Reset สถานะเริ่มต้น
        notificationIcon.innerHTML = '';
        notificationActions.innerHTML = '';
        notificationIcon.className = 'notification-icon';

        notificationTitle.textContent = title;
        notificationMessage.innerHTML = message.replace(/\n/g, '<br>'); // รองรับการขึ้นบรรทัดใหม่

        // สร้างปุ่มตามประเภท
        switch (type) {
            case 'loading':
                notificationIcon.classList.add('loading');
                notificationIcon.innerHTML = '<div class="loader"></div>';
                // ไม่มีปุ่มสำหรับ Loading
                break;
            
            case 'success':
                notificationIcon.classList.add('success');
                notificationIcon.innerHTML = '✔️';
                const okButtonSuccess = document.createElement('button');
                okButtonSuccess.textContent = 'ตกลง';
                okButtonSuccess.onclick = () => {
                    hideNotification();
                    resolve(true);
                };
                notificationActions.appendChild(okButtonSuccess);
                break;

            case 'error':
                notificationIcon.classList.add('error');
                notificationIcon.innerHTML = '❌';
                const okButtonError = document.createElement('button');
                okButtonError.textContent = 'ตกลง';
                okButtonError.onclick = () => {
                    hideNotification();
                    resolve(true); // resolve(true) เพราะผู้ใช้แค่กดรับทราบ
                };
                notificationActions.appendChild(okButtonError);
                break;

            case 'confirm':
                notificationIcon.classList.add('confirm');
                notificationIcon.innerHTML = '❓';
                
                const confirmButton = document.createElement('button');
                confirmButton.textContent = 'ยืนยัน';
                confirmButton.className = 'btn-confirm';
                confirmButton.onclick = () => {
                    hideNotification();
                    resolve(true); // ผู้ใช้กดยืนยัน
                };

                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'ยกเลิก';
                cancelButton.className = 'btn-cancel';
                cancelButton.onclick = () => {
                    hideNotification();
                    resolve(false); // ผู้ใช้กดยกเลิก
                };
                
                notificationActions.appendChild(cancelButton);
                notificationActions.appendChild(confirmButton);
                break;
        }

        notificationModal.style.display = 'block';
    });
}

// ฟังก์ชันสำหรับเปิดหน้าต่างประวัติ openHistory Modal
async function openHistoryModal() {
    DOMElements.historyLogContainer.innerHTML = '<p>กำลังโหลดประวัติ...</p>';
    DOMElements.historyModal.style.display = 'block';

    const logs = await db.activityLog.orderBy('timestamp').reverse().toArray();

    if (logs.length === 0) {
        DOMElements.historyLogContainer.innerHTML = '<p>ยังไม่มีประวัติการใช้งาน</p>';
        return;
    }

    const logHtml = logs.map(log => {
        const timestamp = log.timestamp.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' });
        const actionClass = log.action.toLowerCase().replace(' ', '_');
        return `
            <div class="log-entry">
                <div class="log-timestamp">${timestamp}</div>
                <div class="log-action ${actionClass}">${log.action}</div>
                <div class="log-details">${log.details.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    }).join('');

    DOMElements.historyLogContainer.innerHTML = logHtml;
}

// ฟังก์ชันสำหรับปิดหน้าต่างประวัติ closeHistory Modal
function closeHistoryModal() {
    DOMElements.historyModal.style.display = 'none';
}

// REFACTORED: Modal functions
function openAddModal() {
    DOMElements.modalTitle.textContent = 'เพิ่มสาขาใหม่';
    DOMElements.branchForm.reset();
    DOMElements.editingId.value = '';
    DOMElements.modal.style.display = 'block';
    document.getElementById('storeCode').focus();
}

// REFACTORED: edit สาขา functions
async function editBranch(id) {
    const branch = await db.branches.get(id);
    if (!branch) return;
    branchBeforeEdit = branch; // [NEW] จำข้อมูลปัจจุบันไว้ก่อน

    DOMElements.modalTitle.textContent = 'แก้ไขข้อมูลสาขา';
    DOMElements.branchForm.reset();
    
    // REFACTORED: ใช้ loop ในการกรอกข้อมูล
    for (const key in branch) {
        if (DOMElements.branchForm.elements[key]) {
            DOMElements.branchForm.elements[key].value = branch[key] || '';
        }
    }
    DOMElements.editingId.value = branch.id;
    
    DOMElements.modal.style.display = 'block';
}
function closeModal() {
    DOMElements.modal.style.display = 'none';
}

// REFACTORED: บันทึกข้อมูล (เพิ่ม/แก้ไข)
async function saveBranch(event) {
  event.preventDefault();

  const formData = new FormData(DOMElements.branchForm);
  const branchData = Object.fromEntries(formData.entries());

  // ค่าจาก hidden สำหรับโหมดแก้ไขเท่านั้น (อย่าใช้ field ชื่อ "id" ในฟอร์ม)
  const editingIdRaw = DOMElements.editingId.value;
  const editingId = editingIdRaw ? Number(editingIdRaw) : NaN;

  // กันข้อมูลซ้ำตาม storeCode
  const existing = await db.branches.where('storeCode').equals(branchData.storeCode).first();
  if (existing && existing.id !== editingId) {
    await showNotification({ type: 'error', title: 'ข้อมูลซ้ำซ้อน', message: 'รหัสร้านนี้มีอยู่แล้ว' });
    return;
  }

  try {
    if (!Number.isNaN(editingId) && editingId > 0 && branchBeforeEdit) {
      // UPDATE
      delete branchData.id; // กันไม่ให้เปลี่ยน primary key โดยไม่ตั้งใจ
      await db.branches.update(editingId, branchData);

      // (ทำ diff+log เหมือนเดิม)
      const fieldLabels = {
        storeCode: 'รหัสร้าน', branchName: 'ชื่อสาขา', region: 'ภาค', status: 'สถานะ',
        onlineStatus: 'สถานะเชื่อมOnline', recorder: 'เครื่องบันทึกภาพ', brand: 'ยี่ห้อ',
        district: 'อำเภอ', province: 'จังหวัด', phone: 'เบอร์โทรร้าน', fc: 'FC.',
        phone_fc: 'เบอร์โทร Hybrid FC', zone: 'เขต', phone_zone: 'เบอร์โทร Hybrid เขต',
        department: 'ฝ่าย', phone_dept: 'เบอร์โทร Hybrid ฝ่าย', gm: 'GM.',
        phone_gm: 'เบอร์โทร Hybrid GM', avp: 'AVP', phone_avp: 'เบอร์โทร Hybrid AVP'
      };
      const changes = [];
      for (const k in branchData) {
        if (branchData[k] !== branchBeforeEdit[k]) {
          const label = fieldLabels[k] || k;
          changes.push(`- ${label}: เปลี่ยนจาก "${branchBeforeEdit[k] || '(ว่าง)'}" เป็น "${branchData[k] || '(ว่าง)'}"`);
        }
      }
      await showNotification({ type: 'success', title: 'สำเร็จ', message: 'แก้ไขข้อมูลสาขาเรียบร้อยแล้ว' });
      if (changes.length > 0) {
        const logDetails = `แก้ไขข้อมูลสาขา: ${branchData.storeCode} - ${branchData.branchName}\n${changes.join('\n')}`;
        await logActivity('EDIT', logDetails);
      }

    } else {
      // ADD
      delete branchData.id; // สำคัญ: ห้ามมี id ตอน add เพื่อให้ ++id ทำงาน
      const newId = await db.branches.add(branchData);
      // ใช้ DB เป็น single source of truth — ดึงกลับมา ไม่ push object ฟอร์ม
      // (กันกรณี id เพี้ยน/ race condition)
      // const newBranch = await db.branches.get(newId);
      // allBranches.push(newBranch); // ไม่จำเป็นแล้วถ้าเรา reload ด้านล่าง
      await showNotification({ type: 'success', title: 'สำเร็จ', message: 'เพิ่มข้อมูลสาขาเรียบร้อยแล้ว' });
      await logActivity('ADD', `เพิ่มสาขาใหม่: ${branchData.storeCode} - ${branchData.branchName}`);
    }

    closeModal();
    branchBeforeEdit = null;
    await updateDataSource(currentDataSource.name, 'modified');

    // ✅ รีโหลดจาก DB ทุกครั้งหลังบันทึก เพื่อให้ allBranches มี id ที่แท้จริง
    await loadDataFromDB();
    applyFilters();

  } catch (error) {
    console.error("Failed to save branch:", error);
    await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถบันทึกข้อมูลได้' });
  }
}


// ฟังก์ชันยืนยันการลบ modal
async function confirmDeleteBranch(id) {
    const branch = allBranches.find(b => b.id === id);
    if (branch) {
        const confirmed = await showNotification({
            type: 'confirm',
            title: 'ยืนยันการลบ',
            message: `คุณต้องการลบสาขา "${branch.branchName || branch.storeCode}" ใช่หรือไม่?`
        });
        if (confirmed) {
            deleteBranch(id, branch); // ส่งข้อมูล branch ไปด้วยเพื่อใช้ log
        }
    }
}

// ฟังก์ชัการลบสาขา modal
async function deleteBranch(id, branchInfo) { // รับ branchInfo เพิ่ม
    try {
        await db.branches.delete(id);
        await showNotification({ type: 'success', title: 'สำเร็จ', message: 'ลบข้อมูลสาขาเรียบร้อยแล้ว' });
        await logActivity('DELETE', `ลบสาขา: ${branchInfo.storeCode} - ${branchInfo.branchName}`);
        await updateDataSource(currentDataSource.name, 'modified');
        await loadDataFromDB();
    } catch (error) {
        console.error("Failed to delete branch:", error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถลบข้อมูลได้' });
    }
}

// ฟังก์ชัการยืนยันสำหรับล้างtable modal
async function confirmClearAllData() {
    const confirmed = await showNotification({
        type: 'confirm',
        title: 'ยืนยันการล้างข้อมูล',
        message: 'คุณต้องการล้างข้อมูลทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้'
    });
    if (confirmed) {
        clearAllData();
    }
}

// ฟังก์ชัการล้างtable modal
async function clearAllData() {
    try {
        await db.branches.clear();
        await showNotification({ type: 'success', title: 'สำเร็จ', message: 'ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว' });;

        await updateDataSource('ยังไม่มีข้อมูล', '');
        allBranches = [];
        applyFilters();
    } catch (error) {
        console.error("Failed to clear data:", error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถล้างข้อมูลได้' });
    }
}

// REFACTORED: การจัดการไฟล์ Upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showNotification({ type: 'loading', title: 'กำลังนำเข้าข้อมูล', message: 'โปรดรอสักครู่...' });

    try {
        const data = await parseFile(file);
        if (data.length === 0) {
            await showNotification({ type: 'error', title: 'ไฟล์ข้อมูลไม่ถูกต้อง', message: 'ไม่พบแถวข้อมูลในไฟล์ (ต้องมีอย่างน้อย 1 แถวข้อมูลใต้ Header)' });
            refreshUI();
            return;
        }

        const { newBranches, skippedCount } = processData(data);
        
        await db.transaction('rw', db.branches, async () => {
            await db.branches.clear();
            await db.branches.bulkAdd(newBranches);
        });

        await updateDataSource(file.name, 'loaded');
        await logActivity('IMPORT', `นำเข้าข้อมูลจากไฟล์ ${file.name} จำนวน ${newBranches.length} รายการ`);
        await showNotification({ type: 'success', title: 'นำเข้าสำเร็จ', message: `นำเข้าข้อมูลใหม่: ${newBranches.length} รายการ\nข้ามแถวข้อมูลที่ไม่สมบูรณ์/ว่าง: ${skippedCount} รายการ` });
        await loadDataFromDB();

    } catch (error) {
        console.error('Error handling file upload:', error);
        await showNotification({ type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถอ่านหรือประมวลผลไฟล์ได้\nกรุณาตรวจสอบรูปแบบไฟล์' });
        refreshUI();
    } finally {
        event.target.value = ''; // รีเซ็ต input file
    }
}

//ฟังก์ชัสำหรับการอ่าน และวิเคราะห์ไฟล์
function parseFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const content = e.target.result;
                if (file.name.toLowerCase().endsWith('.csv')) {
                    const workbook = XLSX.read(content, {type: 'string'});
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval:'' }));
                } else { // xls, xlsx
                    const workbook = XLSX.read(content, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval:'' }));
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        if (file.name.toLowerCase().endsWith('.csv')) {
             reader.readAsText(file, 'UTF-8');
        } else {
             reader.readAsArrayBuffer(file);
        }
    });
}

//ฟังก์ชันสำหรับการเพิ่มสาขาใหม่
function processData(data) {
    const headers = data[0].map(h => String(h).trim());
    const columnMapping = getColumnMapping();

    // [NEW] สร้าง Map เพื่อปรับมาตรฐานข้อมูลสำหรับ Dropdown
    const regionMap = {
        "be": "BE", "bg": "BG", "bn": "BN", "bs": "BS", "bw": "BW", "cm": "CM",
        "nel": "NEL", "neu": "NEU", "pk": "PK", "rc": "RC", "rel": "REL",
        "reu": "REU", "rn": "RN", "rsl": "RSL", "rsu": "RSU", "ub": "UB", "yl": "YL"
    };
    const statusMap = { 
        "co": "CO", 
        "SBP": "SBP",
        "sub-area": "Sub-Area", 
        "ปตท": "ปตท",
    };
    const allZoneMap = { 
        "bangkok": "Bangkok", 
        "region": "Region", 
        "sub-area": "Sub-Area"
    };
    const shopTypeMap = { 
        "shophouse": "Shophouse", "standalone": "Standalone", 
        "pb": "PB", "sa": "SA", "sh": "SH"
    };

    let skippedCount = 0;
    const newBranches = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0 || !row.some(cell => cell && String(cell).trim())) {
            skippedCount++;
            continue;
        }
        const newBranch = {};
        headers.forEach((header, index) => {
            const mappedField = columnMapping[header];
            if (mappedField && row[index] !== undefined && row[index] !== null) {
                newBranch[mappedField] = String(row[index]).trim();
            }
        });

        // [NEW] ทำการ Normalize ข้อมูลที่อาจเพี้ยน
        if (newBranch.region) {
            newBranch.region = regionMap[newBranch.region.toLowerCase()] || newBranch.region;
        }
        if (newBranch.status) {
            newBranch.status = statusMap[newBranch.status.toLowerCase()] || newBranch.status;
        }
        if (newBranch.allZone) {
            newBranch.allZone = allZoneMap[newBranch.allZone.toLowerCase()] || newBranch.allZone;
        }
        if (newBranch.shopType) {
            newBranch.shopType = shopTypeMap[newBranch.shopType.toLowerCase()] || newBranch.shopType;
        }

        if (newBranch.onlineStatus) {
            const status = newBranch.onlineStatus.toLowerCase().trim();
            if (status.includes('ไม่สามารถ')) {
                newBranch.onlineStatus = 'ไม่สามารถเชื่อม Online';
            } else if (status.includes('cctv') || status.includes('ไม่ติดกล้อง')) {
                newBranch.onlineStatus = 'ร้านไม่ติดกล้อง CCTV';
            } else if (status.includes('สามารถ') || status === 'online' || status === '1' || status === 'true') {
                newBranch.onlineStatus = 'สามารถเชื่อม Online';
            } else {
                newBranch.onlineStatus = 'ไม่สามารถเชื่อม Online';
            }
        } else {
            newBranch.onlineStatus = 'ไม่สามารถเชื่อม Online';
        }

        if (newBranch.storeCode) {
            newBranches.push(newBranch);
        } else {
            skippedCount++;
        }
    }
    return { newBranches, skippedCount };
}

//ฟังก์ชันสำหรับการดึงข้อมูลที่สร้างไว้มาแสดง
function getColumnMapping() {
    return {
        'รหัสร้าน': 'storeCode', 'รหัส': 'storeCode', 'Store Code': 'storeCode', 'Code': 'storeCode',
        'ชื่อสาขา': 'branchName', 'สาขา': 'branchName', 'Branch Name': 'branchName', 'Branch': 'branchName',
        'ภาค': 'region', 'Region': 'region',
        'สถานะ': 'status', 'Status': 'status',
        'All Zone': 'allZone', 'allzone': 'allZone',
        'สถานะเชื่อมOnline': 'onlineStatus', 'Online Status': 'onlineStatus', 'Online': 'onlineStatus',
        'อำเภอ': 'district', 'District': 'district',
        'จังหวัด': 'province', 'Province': 'province',
        'FC.': 'fc', 'FC': 'fc',
        'เขต': 'zone', 'Zone': 'zone',
        'ฝ่าย': 'department', 'Department': 'department',
        'GM.': 'gm', 'GM': 'gm',
        'AVP': 'avp',
        'Shophouse/Standalone': 'shopType', 'Shop Type': 'shopType', 'Type': 'shopType',
        // [NEW] เพิ่มการแมปสำหรับคอลัมน์ใหม่
        'เครื่องบันทึกภาพ': 'recorder', 
        'ยี่ห้อ': 'brand', 
        'เบอร์โทรร้าน': 'phone',
        'เบอร์โทร Hybrid FC': 'phone_fc', 
        'เบอร์โทร Hybrid เขต': 'phone_zone',
        'เบอร์โทร Hybrid ฝ่าย': 'phone_dept', 
        'เบอร์โทร Hybrid GM': 'phone_gm',
        'เบอร์โทร Hybrid AVP': 'phone_avp'
    };
}
