// === popup.js (v4 - DOM-based Login Status) ===
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
        document.getElementById("status").textContent =
            "❌ ใช้ Tabs API ไม่ได้ (เช็ก permission)";
        return;
    }

    if (!tab || !tab.url) {
        document.getElementById("status").textContent = "❌ ไม่พบแท็บปัจจุบัน";
        return;
    }

    const btnCopy = document.getElementById("btnCopy");
    const btnSearch = document.getElementById("btnSearch");
    const btnDelete = document.getElementById("btnDelete");
    const statusDiv = document.getElementById("status");
    const dataCard = document.getElementById("dataCard");
    const storedCompanyDiv = document.getElementById("storedCompany");
    const swStatusSpan = document.getElementById("swStatus");
    const csStatusSpan = document.getElementById("csStatus");

    // ---------- 1) ตรวจสถานะ Login จาก DOM ของแท็บปัจจุบัน ----------

    function setSwStatus(text) {
        swStatusSpan.textContent = text;
    }
    function setCsStatus(text) {
        csStatusSpan.textContent = text;
    }

    // ตรวจ SalesWiz
    if (tab.url.includes("saleswiz.uih.co.th")) {
        chrome.scripting.executeScript(
            {
                target: { tabId: tab.id },
                func: () => {
                    const email = document.querySelector("input[name='email']");
                    const pass = document.querySelector("input[name='password']");
                    // ถ้ามีช่อง email/password = หน้า Login
                    const isLoginPage = !!(email && pass);
                    return { isLoginPage };
                }
            },
            (results) => {
                if (chrome.runtime.lastError || !results || !results[0]) {
                    setSwStatus("⚪ ยังไม่ทราบ");
                    return;
                }
                const { isLoginPage } = results[0].result;
                setSwStatus(isLoginPage ? "⛔ ยังไม่ได้ Login" : "✅ Login อยู่");
            }
        );
    } else {
        setSwStatus("⚪ ยังไม่ทราบ (ไม่ได้อยู่ SalesWiz)");
    }

    // ตรวจ CostSheet
    if (tab.url.includes("costsheet.uih.co.th")) {
        chrome.scripting.executeScript(
            {
                target: { tabId: tab.id },
                func: () => {
                    const u = document.getElementById("Login_Container_txtUsername");
                    const p = document.getElementById("Login_Container_txtPassword");
                    const isLoginPage = !!(u && p);
                    return { isLoginPage };
                }
            },
            (results) => {
                if (chrome.runtime.lastError || !results || !results[0]) {
                    setCsStatus("⚪ ยังไม่ทราบ");
                    return;
                }
                const { isLoginPage } = results[0].result;
                setCsStatus(isLoginPage ? "⛔ ยังไม่ได้ Login" : "✅ Login อยู่");
            }
        );
    } else {
        setCsStatus("⚪ ยังไม่ทราบ (ไม่ได้อยู่ CostSheet)");
    }

    // ---------- 2) การ์ด dealData (เหมือนเดิม) ----------

    function updateDealCard() {
        chrome.storage.local.get("dealData", function (data) {
            if (data.dealData) {
                dataCard.classList.remove("hidden");
                btnDelete.classList.remove("hidden");
                let company = data.dealData.company || "(ไม่ระบุ)";
                storedCompanyDiv.textContent = company;
                storedCompanyDiv.title = company;
            } else {
                dataCard.classList.add("hidden");
                btnDelete.classList.add("hidden");
                storedCompanyDiv.textContent = "-";
            }
        });
    }
    updateDealCard();

    // ---------- 3) แสดง context ของหน้าปัจจุบัน + ปุ่มต่าง ๆ ----------

    if (tab.url.includes("saleswiz.uih.co.th/deal/detail/")) {
        statusDiv.textContent = "📍 SalesWiz Deal";
        btnCopy.classList.remove("hidden");

        btnCopy.onclick = () => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["saleswiz_reader.js"]
            });
            window.close();
        };
    } else if (tab.url.includes("costsheet.uih.co.th/CreateDoc.aspx")) {
        statusDiv.textContent = "📍 Cost Sheet";

        chrome.storage.local.get("dealData", function (data) {
            if (data.dealData) btnSearch.classList.remove("hidden");
        });

        btnSearch.onclick = () => {
            chrome.tabs.sendMessage(tab.id, { action: "START_SEARCH" });
        };
    } else {
        statusDiv.textContent = "⚪ หน้าเว็บทั่วไป";
    }

    // ---------- 4) ปุ่มลบข้อมูล ----------

    btnDelete.onclick = () => {
        chrome.storage.local.remove("dealData", updateDealCard);
    };
});