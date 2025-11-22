// === popup.js (no customer search button, note support only) ===
document.addEventListener("DOMContentLoaded", async () => {
    let tab = null;

    try {
        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        tab = tabs[0];
    } catch (e) {
        console.error("tabs.query error:", e);
        const status = document.getElementById("status");
        if (status) {
            status.textContent = "❌ ใช้ Tabs API ไม่ได้ (เช็ก permission)";
        }
        return;
    }

    if (!tab || !tab.url) {
        const status = document.getElementById("status");
        if (status) {
            status.textContent = "❌ ไม่พบแท็บปัจจุบัน";
        }
        return;
    }

    // --------- DOM element refs ---------
    const btnCopy        = document.getElementById("btnCopy");
    const btnDelete      = document.getElementById("btnDelete");
    const statusDiv      = document.getElementById("status");

    const dataCard       = document.getElementById("dataCard");
    const storedCompany  = document.getElementById("storedCompany");
    const noteTextarea   = document.getElementById("dealNote");
    const btnSaveNote    = document.getElementById("btnSaveNote");
    const btnAINote      = document.getElementById("btnAINote");
    const noteStatus     = document.getElementById("noteStatus");

    let currentDealId = null;

    // --------- helper: แสดงสถานะการบันทึกโน้ต ---------
    function showNoteStatus(msg) {
        if (!noteStatus) return;
        noteStatus.textContent = msg || "บันทึกแล้ว";
        noteStatus.classList.remove("hidden");
        setTimeout(() => noteStatus.classList.add("hidden"), 1500);
    }

    // --------- โหลด deal + note จาก storage มาลง UI ---------
    function updateUI() {
        chrome.storage.local.get(["dealData", "dealNotes"], (data) => {
            const deal  = data.dealData || null;
            const notes = data.dealNotes || {};

            if (deal && dataCard && storedCompany) {
                dataCard.classList.remove("hidden");
                if (btnDelete) btnDelete.classList.remove("hidden");

                const company = deal.company || "(ไม่ระบุชื่อ)";
                storedCompany.textContent = company;
                storedCompany.title = company;

                currentDealId = deal.id || null;

                if (currentDealId && notes[currentDealId]) {
                    if (noteTextarea) noteTextarea.value = notes[currentDealId];
                } else {
                    if (noteTextarea) noteTextarea.value = "";
                }
            } else {
                if (dataCard)      dataCard.classList.add("hidden");
                if (btnDelete)     btnDelete.classList.add("hidden");
                if (storedCompany) storedCompany.textContent = "-";
                if (noteTextarea)  noteTextarea.value = "";
                currentDealId = null;
            }
        });
    }
    updateUI();

    // --------- ปุ่มบันทึกโน้ต ---------
    if (btnSaveNote) {
        btnSaveNote.onclick = () => {
            if (!currentDealId) {
                alert("ยังไม่มีดีลที่จำไว้ เลยยังผูกโน้ตไม่ได้");
                return;
            }
            const text = noteTextarea ? noteTextarea.value || "" : "";

            chrome.storage.local.get("dealNotes", (data) => {
                const notes = data.dealNotes || {};
                notes[currentDealId] = text;

                chrome.storage.local.set({ dealNotes: notes }, () => {
                    console.log("Saved note for deal", currentDealId);
                    showNoteStatus("บันทึกโน้ตแล้ว");
                });
            });
        };
    }

    // --------- ปุ่ม Auto Note (เทมเพลตจาก dealData) ---------
    if (btnAINote) {
        btnAINote.onclick = () => {
            chrome.storage.local.get("dealData", (data) => {
                const deal = data.dealData;
                if (!deal) {
                    alert("ยังไม่มีข้อมูลดีลในระบบ (ลองกด 🚀 ดึงข้อมูลจาก SalesWiz ก่อน)");
                    return;
                }

                const parts = [];
                if (deal.company) parts.push(`ลูกค้า: ${deal.company}`);
                if (deal.type)    parts.push(`ประเภทดีล: ${deal.type}`);
                if (deal.period)  parts.push(`ระยะสัญญา: ${deal.period} เดือน`);
                if (deal.owner)   parts.push(`Sales Owner: ${deal.owner}`);
                if (deal.id)      parts.push(`Deal ID: ${deal.id}`);

                const autoText =
                    "สรุปดีล (Auto Note จากข้อมูลที่ดึงมา):\n" +
                    parts.join("\n") +
                    "\n\nความต้องการหลักของลูกค้า (เติมเองเพิ่มได้):\n- ";

                if (noteTextarea) {
                    noteTextarea.value = autoText;
                    showNoteStatus("สร้างโน้ตอัตโนมัติแล้ว (แก้เพิ่มได้)");
                }
            });
        };
    }

    // --------- ปุ่มดึงข้อมูลจาก SalesWiz ---------
    if (tab.url.includes("saleswiz.uih.co.th/deal/detail/")) {
        if (statusDiv) statusDiv.textContent = "📍 SalesWiz Deal";

        if (btnCopy) {
            btnCopy.classList.remove("hidden");
            btnCopy.onclick = () => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["saleswiz_reader.js"]
                });
                window.close();
            };
        }
    } else if (tab.url.includes("costsheet.uih.co.th/CreateDoc.aspx")) {
        // หน้า CostSheet – ตอนนี้ใช้ auto จาก costsheet_writer.js แล้ว
        if (statusDiv) statusDiv.textContent = "📍 Cost Sheet (Auto Fill กำลังจัดการให้)";
        if (btnCopy)  btnCopy.classList.add("hidden"); // ไม่ต้องมีปุ่มใด ๆ บนหน้า CostSheet
    } else {
        if (statusDiv) statusDiv.textContent = "⚪ หน้าเว็บทั่วไป";
        if (btnCopy)   btnCopy.classList.add("hidden");
    }

    // --------- ปุ่มลบ dealData (ไม่ลบโน้ตเดิม) ---------
    if (btnDelete) {
        btnDelete.onclick = () => {
            chrome.storage.local.remove(["dealData"], () => {
                updateUI();
            });
        };
    }
});