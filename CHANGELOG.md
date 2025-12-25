# Changelog

All notable changes to UIH Data Copier extension will be documented in this file.

## [4.1] - 2025-12-25

### Added
- **Auto-Delete Settings** - ตั้งค่าลบข้อมูลดีลอัตโนมัติหลังใส่ใน CostSheet
- **Delay in Seconds** - ตั้งเวลาลบได้ตั้งแต่ 0-3600 วินาที (0 = ลบทันที)
- **Enhanced Logging** - เพิ่ม log ใน console ทุกไฟล์หลัก:
  - `[SalesWizReader]` - ดึงข้อมูลจาก SalesWiz
  - `[CostSheetWriter]` - กรอกข้อมูลใน CostSheet
  - `[Background]` - จัดการ Alarm และ Login Check
  - `[LoginManager]` - ตรวจสถานะ Login

---

## [4.0] - 2025-12-11

### Added
- **Collapsible History** - ประวัติดีลซ่อนได้ กดเปิด/ปิด
- **Clear History** - ปุ่มล้างประวัติทั้งหมด
- **Activities Extraction** - ดึง Past/Next Activities จาก SalesWiz
- **AI Summary ใช้ Activities** - AI สรุปข้อมูลจากกิจกรรมล่าสุด
- **Copy to CostSheet** - ปุ่ม copy note ไปใส่ Project Description
- **Project Description Auto-fill** - ใส่ Project Description อัตโนมัติ

### Changed
- ขยายพื้นที่ Note ให้ใหญ่ขึ้น
- ปรับ UI ให้กระชับขึ้น

---

## [3.9] - 2025-12-11

### Added
- **AI Provider Settings** - เลือกได้ระหว่าง Ollama (Local) และ Groq Cloud
- **Groq Integration** - ใช้ Groq API ฟรีสำหรับสร้าง AI Note
- **Settings Page** - ตั้งค่า AI provider และ API key ได้เอง

---

## [3.8] - 2025-12-11

### Added
- **Keyboard Shortcut** - กด `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`) เพื่อดึงข้อมูลดีลทันที

---

## [3.7] - 2025-12-11

### Added
- **Error Handling** in `saleswiz_reader.js` - try-catch และแจ้งเตือนเมื่อดึงข้อมูลไม่สำเร็จ
- **Deal History** - บันทึกประวัติดีลที่ดึงข้อมูล (เก็บสูงสุด 20 รายการ)
- **AI Note Timeout** - timeout 30 วินาทีเมื่อเรียก Ollama API
- **Safe Fuzzy Matching** - หาชื่อ Sale ได้แม้ไม่ตรงเป๊ะ
- **Name Prefix Stripping** - ลบ Mr., Ms., Mrs., นาย, นาง, นางสาว ก่อน match

### Changed
- วันที่ Contract Start Date เปลี่ยนจากพรุ่งนี้เป็น **วันปัจจุบัน** (Thailand timezone)
- ปรับปรุง dropdown matching ให้ไม่เกิด infinite loop

### Fixed
- แก้ไข comment header ใน `login_manager.js` และ `options.js` ที่ระบุชื่อไฟล์ผิด
- แก้ไข Sale Name dropdown ที่ทำให้เกิด infinite loop

---

## [3.6] - Previous Version

### Features
- ดึงข้อมูลจาก SalesWiz และกรอกใน CostSheet อัตโนมัติ
- รองรับ Auto/Manual Delay Mode
- AI Note ด้วย Ollama Phi-3
- Keep-Alive ตรวจสถานะ login ทุก 5 นาที
