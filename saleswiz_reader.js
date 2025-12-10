// === saleswiz_reader.js (v2.3 - With Error Handling & History) ===
(function () {
    console.log("SalesWiz Reader v2.3 Running...");

    try {
        let dealId = "";
        let companyName = "";
        let durationText = "0 Month";
        let dealType = "";
        let ownerName = "";

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

        let contractPeriod = durationText.split(" ")[0].trim();

        // สร้าง deal object
        const newDeal = {
            id: dealId,
            company: companyName,
            period: contractPeriod,
            type: dealType,
            owner: ownerName,
            savedAt: Date.now()
        };

        // ตรวจสอบว่าดึงข้อมูลได้หรือไม่
        if (!dealId && !companyName) {
            console.warn("⚠️ ไม่พบข้อมูลดีลในหน้านี้");
            alert("⚠️ ไม่พบข้อมูลดีลในหน้านี้\nกรุณาตรวจสอบว่าอยู่ในหน้า Deal Detail");
            return;
        }

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
                    console.log("✅ บันทึกข้อมูลดีลและ history เรียบร้อย:", newDeal);
                    // TODO: [REFACTOR] Move URL to constants.js
                    window.open("https://costsheet.uih.co.th/CreateDoc.aspx", "_blank");
                }
            );
        });

    } catch (error) {
        console.error("❌ SalesWiz Reader Error:", error);
        alert("❌ เกิดข้อผิดพลาดในการดึงข้อมูล\n" + error.message);
    }
})();