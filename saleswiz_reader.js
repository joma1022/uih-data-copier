// === saleswiz_reader.js (v2.5 - Enhanced Logging) ===
(function () {
    const LOG_PREFIX = "[SalesWizReader]";
    console.log(`${LOG_PREFIX} 🚀 v2.5 Running...`);

    try {
        let dealId = "";
        let companyName = "";
        let durationText = "0 Month";
        let dealType = "";
        let ownerName = "";
        let activities = [];

        // ดึง Deal ID
        let dealIdElement = document.querySelector(".deal-id");
        if (dealIdElement) {
            dealId = dealIdElement.innerText.replace(/[^0-9]/g, "");
        }

        // ดึงชื่อบริษัท
        let companyIcon =
            document.querySelector("img[src*='icon_company_info']") ||
            document.querySelector("img[alt='company icon']");

        if (companyIcon && companyIcon.nextElementSibling) {
            companyName = companyIcon.nextElementSibling.innerText.trim();
        }

        // ดึงข้อมูลจาก field-title
        let allTitles = document.querySelectorAll(".field-title");
        allTitles.forEach((t) => {
            let val = t.nextElementSibling;
            if (!val) return;

            let k = t.innerText.trim();
            let v = val.innerText.trim();

            if (k === "Service Duration") durationText = v;
            if (k === "Deal Type") dealType = v;
            if (k === "Owner") ownerName = v;
        });

        // ดึง Next Activities - ใช้ selector ที่ตรงกับ SalesWiz
        // หา h4 ที่มีคำว่า "Next Activities" แล้วหา container ถัดไป
        const allH4 = document.querySelectorAll("h4");
        allH4.forEach((h4) => {
            const text = h4.innerText.trim().toLowerCase();
            if (text.includes("next activities") || text.includes("next activity")) {
                // หา container ที่อยู่ใกล้ๆ
                const parent = h4.closest(".activities-types") || h4.parentElement;
                if (parent) {
                    const items = parent.querySelectorAll(".activity-content p.title.card-text, .title.card-text, .card-text");
                    items.forEach((item) => {
                        const itemText = item.innerText.trim();
                        if (itemText && itemText.length > 5) {
                            activities.push({ type: "next", text: itemText.substring(0, 500) });
                        }
                    });
                }
            }
        });

        // ดึง Past Activities
        allH4.forEach((h4) => {
            const text = h4.innerText.trim().toLowerCase();
            if (text.includes("past activities") || text.includes("past activity")) {
                const parent = h4.closest(".activities-types") || h4.parentElement;
                if (parent) {
                    const items = parent.querySelectorAll(".activity-content p.title.card-text, .title.card-text, .card-text");
                    items.forEach((item, idx) => {
                        if (idx >= 10) return;
                        const itemText = item.innerText.trim();
                        if (itemText && itemText.length > 5) {
                            activities.push({ type: "past", text: itemText.substring(0, 500) });
                        }
                    });
                }
            }
        });

        // Fallback: ถ้ายังไม่เจอ ลองหาจาก .activity-content โดยตรง
        if (activities.length === 0) {
            const allActivityContent = document.querySelectorAll(".activity-content");
            allActivityContent.forEach((content, idx) => {
                if (idx >= 15) return;
                const cardTexts = content.querySelectorAll("p.title.card-text, .card-text");
                cardTexts.forEach((p) => {
                    const itemText = p.innerText.trim();
                    if (itemText && itemText.length > 5 && itemText.length < 500) {
                        activities.push({ type: "activity", text: itemText });
                    }
                });
            });
        }

        console.log(`${LOG_PREFIX} 📋 ดึง Activities ได้: ${activities.length} รายการ`);

        let contractPeriod = durationText.split(" ")[0].trim();

        // สร้าง deal object
        const newDeal = {
            id: dealId,
            company: companyName,
            period: contractPeriod,
            type: dealType,
            owner: ownerName,
            activities: activities,
            savedAt: Date.now()
        };

        // ตรวจสอบว่าดึงข้อมูลได้หรือไม่
        if (!dealId && !companyName) {
            console.warn(`${LOG_PREFIX} ⚠️ ไม่พบข้อมูลดีลในหน้านี้`);
            alert("⚠️ ไม่พบข้อมูลดีลในหน้านี้\nกรุณาตรวจสอบว่าอยู่ในหน้า Deal Detail");
            return;
        }

        console.log(`${LOG_PREFIX} 📦 ข้อมูลที่ดึงได้:`, {
            dealId,
            company: companyName,
            type: dealType,
            owner: ownerName,
            period: contractPeriod,
            activitiesCount: activities.length
        });

        // บันทึก dealData และเพิ่มเข้า dealHistory
        chrome.storage.local.get(["dealHistory"], function (data) {
            let history = data.dealHistory || [];

            // ลบ deal ซ้ำ (ถ้ามี ID เดียวกัน)
            if (dealId) {
                history = history.filter((h) => h.id !== dealId);
            }

            // เพิ่ม deal ใหม่ไว้หน้าสุด
            history.unshift(newDeal);

            // จำกัด history ไว้ 20 รายการ
            if (history.length > 20) {
                history = history.slice(0, 20);
            }

            // บันทึกลง storage
            chrome.storage.local.set(
                {
                    dealData: {
                        id: dealId,
                        company: companyName,
                        period: contractPeriod,
                        type: dealType,
                        owner: ownerName
                    },
                    dealHistory: history
                },
                function () {
                    console.log(`${LOG_PREFIX} ✅ บันทึกข้อมูลดีลและ history เรียบร้อย`);
                    console.log(`${LOG_PREFIX} 🌐 เปิด CostSheet...`);
                    // TODO: [REFACTOR] Move URL to constants.js
                    window.open("https://costsheet.uih.co.th/CreateDoc.aspx", "_blank");
                }
            );
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error:`, error);
        alert("❌ เกิดข้อผิดพลาดในการดึงข้อมูล\n" + error.message);
    }
})();