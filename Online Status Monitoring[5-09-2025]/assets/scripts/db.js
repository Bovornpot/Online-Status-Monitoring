// assets/scripts/db.js

// REFACTORED: จัดการฐานข้อมูลด้วย Dexie.js
const db = new Dexie('branchDB');
db.version(4).stores({
    branches: '++id, storeCode, branchName, province, recorder, brand, phone, phone_fc, phone_zone, phone_dept, phone_gm, phone_avp',
    meta: '&key',
    activityLog: '++id, timestamp'
});

// ฟังก์ชันสำหรับบันทึกกิจกรรมลง DB
async function logActivity(action, details) {
    try {
        await db.activityLog.add({
            timestamp: new Date(),
            action: action,
            details: details
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
