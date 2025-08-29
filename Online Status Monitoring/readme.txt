Project Structure
```
/Online Status Monitoring
├── /assets/
│   ├── /libs/
│   │   ├── dexie.min.js         //library ของ javascripts   
│   │   ├── xlsx.full.min.js     //library ของ javascripts 
│   │	└── chart.min.js           // library ของ chart
│   │
│   ├── /styles/
│   │  ├── base.css             // reset, body, container
│   │	├── layout.css          // header, controls, grid
│   │	├── components.css      // stat-card, table, pagination
│   │	├── modal.css           // modal, form
│   │	└── style.css           // import ไฟล์ย่อยทั้งหมด
│   │
│   └── /scripts/
│       ├── db.js               // จัดการฐานข้อมูล (Dexie.js)
│       ├── dom.js              // จัดการ DOM Elements ทั้งหมด
│       ├── ui.js               // อัปเดตการแสดงผลบน UI (ตาราง, สถิติ, Pagination)
│       ├── modals.js           // จัดการ Modal ต่างๆ
│       ├── events.js           // จัดการ Event Listeners ทั้งหมด
│       ├── utils.js            // ฟังก์ชันย่อยๆ ที่ใช้งานทั่วไป
│       ├── export.js           // ฟังก์ชันสำหรับส่งออกไฟล์
│       └── app.js              // ไฟล์หลักที่รันแอปพลิเคชัน
│   
└── index.html
```
