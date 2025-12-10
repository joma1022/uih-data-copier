# Changelog

All notable changes to UIH Data Copier extension will be documented in this file.

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
