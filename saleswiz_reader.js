// === saleswiz_reader.js (v3.0 - Wisible React Support) ===
(function () {
    const LOG_PREFIX = "[SalesWizReader]";
    console.log(`${LOG_PREFIX} 🚀 v3.0 Running (Wisible Support)...`);

    try {
        let dealId = "";
        let companyName = "";
        let durationText = "0 Month";
        let dealType = "";
        let ownerName = "";
        let activities = [];

        // 1. ดึง Deal ID (จาก URL หรือ Title)
        // URL Format: https://.../deal/detail/12345
        const urlMatch = window.location.href.match(/\/deal\/detail\/(\d+)/);
        if (urlMatch && urlMatch[1]) {
            dealId = urlMatch[1];
        } else {
            // Fallback: ลองหาจาก class old school (เผื่อยังเหลือ)
            const dealIdEl = document.querySelector(".deal-id");
            if (dealIdEl) dealId = dealIdEl.innerText.replace(/[^0-9]/g, "");
        }

        // 2. ดึงชื่อบริษัท (Structure ใหม่: .customer-name a)
        const customerNameEl = document.querySelector(".customer-name a");
        if (customerNameEl) {
            companyName = customerNameEl.innerText.trim();
        } else {
            // Fallback
            const companyIcon = document.querySelector("img[src*='icon_company_info']") || document.querySelector("img[alt='company icon']");
            if (companyIcon && companyIcon.nextElementSibling) {
                companyName = companyIcon.nextElementSibling.innerText.trim();
            }
        }

        // 3. ดึง Metadata (Type, Owner, Duration)
        // Structure ใหม่: div > p.field-title + p.card-detail-text
        // เราจะวนหา p.field-title แล้วดูพี่น้องตัวถัดไป
        const allTitles = document.querySelectorAll("p.field-title, .field-title");
        allTitles.forEach((t) => {
            const val = t.nextElementSibling;
            if (!val) return;

            const k = t.innerText.trim().toLowerCase();

            // Logic: Try next sibling first.
            let valNode = t.nextElementSibling;
            let v = "";

            // Helper to get text or input value
            const getValue = (node) => {
                if (!node) return "";
                const input = node.querySelector("input");
                if (input) return input.value.trim();
                return node.innerText.trim();
            };

            v = getValue(valNode);

            // If empty, try the next sibling (skip potential icon container)
            if ((!v || v.length === 0) && valNode && valNode.nextElementSibling) {
                valNode = valNode.nextElementSibling;
                v = getValue(valNode);
            }

            if (k.includes("service duration")) durationText = v;
            if (k.includes("deal type")) dealType = v;
            if (k.includes("owner") || k.includes("contact person")) ownerName = v;
        });

        // Owner (Sale Name) บางทีอาจจะไม่ได้อยู่ใน field-title
        // ลองหาจาก .person-contact-detail .customer-name a (ถ้ามี Sale อยู่ในหน้านั้น)
        if (!ownerName) {
            // Logic เสริม: หาชื่อคนที่มี role เป็น Sale (หรือเอาชื่อแรกที่เจอใน contact list)
            const personNameEl = document.querySelector(".person-contact-detail .customer-name a");
            if (personNameEl) {
                ownerName = personNameEl.innerText.trim();
            }
        }

        // 4. ดึง Activities (Next / Past)
        // ต้องหา Header ก่อน แล้วค่อยหา Content ในกล่องเดียวกัน
        const allH4 = document.querySelectorAll("h4");
        allH4.forEach((h4) => {
            const text = h4.innerText.trim().toLowerCase();
            // Next Activities
            if (text.includes("next activities") || text.includes("next activity")) {
                const parent = h4.closest(".activities-types") || h4.parentElement?.parentElement;
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
            // Past Activities
            else if (text.includes("past activities") || text.includes("past activity")) {
                const parent = h4.closest(".activities-types") || h4.parentElement?.parentElement;
                if (parent) {
                    const items = parent.querySelectorAll(".activity-content p.title.card-text, .title.card-text, .card-text");
                    items.forEach((item, idx) => {
                        if (idx >= 10) return; // เอาแค่ 10 อันล่าสุด
                        const itemText = item.innerText.trim();
                        if (itemText && itemText.length > 5) {
                            activities.push({ type: "past", text: itemText.substring(0, 500) });
                        }
                    });
                }
            }
        });

        // Fallback Activities: ถ้าไม่เจอ H4 ลองหาจาก text content ในหน้า
        if (activities.length === 0) {
            // บาง theme อาจจะไม่ได้ใช้ h4
            // ลองหา div ที่มี text "Next Activities"
            // (ส่วนนี้อาจจะยากหน่อยถ้าไม่มี selector ชัดเจน ไว้ก่อน)
        }

        console.log(`${LOG_PREFIX} 📋 ดึง Activities ได้: ${activities.length} รายการ`);

        let contractPeriod = durationText.split(" ")[0].trim();

        // 5. ตรวจสอบข้อมูลก่อนบันทึก
        if (!dealId && !companyName) {
            console.warn(`${LOG_PREFIX} ⚠️ ไม่พบข้อมูล Deal ID หรือ Company Name`);
            alert("⚠️ ไม่พบข้อมูลดีล (โครงสร้างเว็บอาจเปลี่ยน)\nกรุณาลองรีเฟรชหน้าเว็บ หรือแจ้งผู้พัฒนา");
            return;
        }

        const newDeal = {
            id: dealId,
            company: companyName,
            period: contractPeriod,
            type: dealType,
            owner: ownerName,
            activities: activities,
            savedAt: Date.now()
        };

        console.log(`${LOG_PREFIX} 📦 ข้อมูลที่ดึงได้:`, newDeal);

        // 6. บันทึกลง Storage Call
        chrome.storage.local.get(["dealHistory"], function (data) {
            let history = data.dealHistory || [];

            // ลบ deal ซ้ำ (ถ้ามี ID เดียวกัน)
            if (dealId) {
                history = history.filter((h) => h.id !== dealId);
            } else {
                // ถ้าไม่มี DealID (อาจจะดึงไม่ได้) ให้ลบที่ชื่อซ้ำแทน
                history = history.filter((h) => h.company !== companyName);
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
                    dealData: newDeal, // ส่งทั้ง object ไปเลย
                    dealHistory: history
                },
                function () {
                    console.log(`${LOG_PREFIX} ✅ บันทึกข้อมูลดีลเรียบร้อย`);
                    console.log(`${LOG_PREFIX} 🌐 เปิด CostSheet...`);
                    window.open("https://costsheet.uih.co.th/CreateDoc.aspx", "_blank");
                }
            );
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error:`, error);
        alert("❌ เกิดข้อผิดพลาดในการดึงข้อมูล\n" + error.message);
    }
})();