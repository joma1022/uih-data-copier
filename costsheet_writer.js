// === costsheet_writer.js (v7.1 - Auto/Manual Delay Mode + Stats) ===

console.log("CostSheet Writer v7.1 พร้อมทำงาน...");

// ค่า Config เริ่มต้น (จะถูกทับด้วยค่าจาก Options)
let CFG = {
    delayMode: "auto",       // "auto" | "manual"
    startDelay: 1000,
    clickDelay: 150,
    dropdownDelay: 800,
    popupWait: 800,
    resultWait: 1000,
    popupPollDelay: 150,
    popupTimeout: 8000,
    addPollDelay: 150,
    addTimeout: 10000
};

let customerSearchStarted = false;

// เก็บสถิติ runtime สำหรับ Intelligent Delay
const runtimeStats = {
    popupReadyAvg: null,    // ms
    addFormReadyAvg: null   // ms
};

function saveDelayStats() {
    chrome.storage.local.set({
        delayStats: {
            popupReadyAvg: runtimeStats.popupReadyAvg,
            addFormReadyAvg: runtimeStats.addFormReadyAvg,
            updatedAt: Date.now()
        }
    });
}

// ---------- helper: sanitize config ----------

function clamp(v, min, max, def) {
    if (typeof v !== "number" || Number.isNaN(v)) return def;
    return Math.min(max, Math.max(min, v));
}

function sanitizeConfig(raw) {
    const base = { ...CFG, ...(raw || {}) };

    let mode = (base.delayMode || "auto").toLowerCase();
    if (mode !== "auto" && mode !== "manual") mode = "auto";

    return {
        delayMode:     mode,
        startDelay:     clamp(base.startDelay,     0,    60000, CFG.startDelay),
        clickDelay:     clamp(base.clickDelay,     50,   5000,  CFG.clickDelay),
        dropdownDelay:  clamp(base.dropdownDelay,  200,  10000, CFG.dropdownDelay),
        popupWait:      clamp(base.popupWait,      200,  15000, CFG.popupWait),
        resultWait:     clamp(base.resultWait,     300,  20000, CFG.resultWait),
        popupPollDelay: clamp(base.popupPollDelay, 50,   5000,  CFG.popupPollDelay),
        popupTimeout:   clamp(base.popupTimeout,   1000, 30000, CFG.popupTimeout),
        addPollDelay:   clamp(base.addPollDelay,   50,   5000,  CFG.addPollDelay),
        addTimeout:     clamp(base.addTimeout,     1000, 30000, CFG.addTimeout)
    };
}

// อัปเดตค่าเฉลี่ยอย่างง่าย (moving average)
function updateAvg(currentAvg, newSample, weight = 0.5) {
    if (currentAvg == null) return newSample;
    return currentAvg * (1 - weight) + newSample * weight;
}

// ---------- ฟังก์ชันพื้นฐาน ----------

function getTomorrowDate() {
    const today = new Date();
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    const d = String(t.getDate()).padStart(2, "0");
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const y = t.getFullYear();
    return `${d}/${m}/${y}`;
}

function safeGet(id, label) {
    const el = document.getElementById(id);
    if (!el) console.warn(`⚠️ ไม่เจอ ${label} (#${id})`);
    return el;
}

function normalizeText(t) {
    if (!t) return "";
    return String(t).trim().toUpperCase();
}

function fireDropdownChange(selectElement) {
    try {
        if (typeof selectElement.onchange === "function") {
            selectElement.onchange();
        }
        selectElement.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
        console.warn("⚠️ fireDropdownChange error:", e);
    }
}

// ---------- dropdown helper + Smart Retry ----------

function checkAndSetDropdown(elementId, targetValue, label) {
    const selectElement = document.getElementById(elementId);
    if (!selectElement) {
        console.warn(`⚠️ ไม่เจอ dropdown ${label} (#${elementId})`);
        return { changed: false, hasOptions: false };
    }

    const options = selectElement.options || [];
    if (!options.length) {
        console.warn(`⚠️ dropdown ${label} ไม่มี options (อาจยังโหลดไม่เสร็จ)`);
        return { changed: false, hasOptions: false };
    }

    const target = normalizeText(targetValue);
    let currentText = "";
    if (
        selectElement.selectedIndex >= 0 &&
        selectElement.selectedIndex < options.length
    ) {
        currentText = normalizeText(options[selectElement.selectedIndex].text);
    }

    if (currentText === target && target !== "") {
        console.log(`ℹ️ ${label}: ค่าเดิมตรงอยู่แล้ว (${currentText})`);
        return { changed: false, hasOptions: true };
    }

    // exact match
    for (let i = 0; i < options.length; i++) {
        if (normalizeText(options[i].text) === target) {
            console.log(
                `⚡ ${label}: '${currentText}' -> '${options[i].text}' (exact)`
            );
            selectElement.selectedIndex = i;
            selectElement.value = options[i].value;
            fireDropdownChange(selectElement);
            return { changed: true, hasOptions: true };
        }
    }

    // partial match
    for (let i = 0; i < options.length; i++) {
        if (target && normalizeText(options[i].text).includes(target)) {
            console.log(
                `⚡ ${label}: '${currentText}' -> '${options[i].text}' (contains)`
            );
            selectElement.selectedIndex = i;
            selectElement.value = options[i].value;
            fireDropdownChange(selectElement);
            return { changed: true, hasOptions: true };
        }
    }

    console.log(`❌ ${label}: หา '${targetValue}' ไม่เจอใน dropdown`);
    return { changed: false, hasOptions: true };
}

// ---------- Auto Add Customer + เก็บสถิติ ----------

function autoAddNewCustomer(companyName) {
    if (!companyName) {
        console.warn("autoAddNewCustomer: companyName ว่าง");
        return;
    }
    console.log("⚠️ ไม่พบข้อมูลลูกค้า → เพิ่มใหม่อัตโนมัติ:", companyName);

    const clickIfExists = (id, label) => {
        const el = document.getElementById(id);
        if (el) {
            el.click();
            console.log("คลิก:", label || id);
            return true;
        }
        return false;
    };

    // Cancel popup search
    clickIfExists("cphContent_btnSearchCancel", "SearchCancel");

    // Close popup
    setTimeout(() => {
        clickIfExists("cphContent_btnSearchClose", "SearchClose");
    }, CFG.clickDelay);

    // เปิดฟอร์ม Add Customer (+)
    const addClickTime = Date.now();
    setTimeout(() => {
        if (!clickIfExists("cphContent_btnAddCustomer", "AddCustomer (+)")) {
            console.warn("⚠️ ไม่เจอปุ่ม AddCustomer (+)");
        }
    }, CFG.popupWait);

    // รอให้ฟอร์ม Add Customer โผล่ แล้วใส่ชื่อ + Save
    let loops = 0;
    const pollDelay = CFG.addPollDelay;
    const maxWait = CFG.addTimeout;

    const timer = setInterval(() => {
        loops++;

        const nameBox = document.getElementById("cphContent_txtSearchCusName");
        const saveBtn = document.getElementById("cphContent_btnSubmitCusName");

        if (nameBox && saveBtn) {
            const readyMs = Date.now() - addClickTime;
            runtimeStats.addFormReadyAvg = updateAvg(
                runtimeStats.addFormReadyAvg,
                readyMs
            );
            console.log(
                `📊 Add Customer Form Ready ใน ${readyMs}ms (avg ~ ${Math.round(
                    runtimeStats.addFormReadyAvg
                )}ms)`
            );
            saveDelayStats();

            console.log("📝 ใส่ชื่อในฟอร์ม Add Customer:", companyName);
            nameBox.value = companyName;
            nameBox.dispatchEvent(new Event("input", { bubbles: true }));
            nameBox.dispatchEvent(new Event("change", { bubbles: true }));

            setTimeout(() => {
                saveBtn.click();
                console.log("💾 Save ลูกค้าใหม่เรียบร้อย");
            }, CFG.clickDelay);

            clearInterval(timer);
            return;
        }

        if (loops * pollDelay > maxWait) {
            console.warn("❌ Timeout: หา input/ปุ่ม Save ของ Add Customer ไม่เจอ");
            clearInterval(timer);
        }
    }, pollDelay);
}

// ---------- Auto Customer Search Flow + Intelligent Delay (เฉพาะโหมด Auto) + Smart Retry ----------

function startCustomerSearchFlow(companyName, retryCount = 0, maxRetry = 2) {
    if (!companyName) {
        console.warn("startCustomerSearchFlow: companyName ว่าง");
        return;
    }
    if (customerSearchStarted && retryCount === 0) {
        console.log("ℹ️ customer search เริ่มไปแล้ว ข้าม");
        return;
    }
    if (retryCount === 0) customerSearchStarted = true;

    console.log(
        `🔍 Auto ค้นหาลูกค้า/เพิ่มลูกค้า: '${companyName}' (retry ${retryCount}/${maxRetry}) CFG:`,
        CFG
    );

    const searchBtn = document.getElementById("cphContent_btnSearchCustomer");
    if (!searchBtn) {
        console.warn("⚠️ ไม่เจอปุ่มค้นหาลูกค้า (แว่นขยาย)");
        return;
    }

    const popupClickTime = Date.now();
    searchBtn.click();

    let counter = 0;
    const pollDelay = CFG.popupPollDelay;
    const maxWait = CFG.popupTimeout;

    const popupChecker = setInterval(() => {
        counter++;

        const ddl = document.getElementById("cphContent_ddlSearchCusNAme");
        const input = document.getElementById("cphContent_txtSearchCusName");
        const btnSearch = document.getElementById("cphContent_btnSearchCusName");

        if (ddl && input && btnSearch) {
            clearInterval(popupChecker);

            const readyMs = Date.now() - popupClickTime;
            runtimeStats.popupReadyAvg = updateAvg(
                runtimeStats.popupReadyAvg,
                readyMs
            );
            console.log(
                `📊 Popup Search Ready ใน ${readyMs}ms (avg ~ ${Math.round(
                    runtimeStats.popupReadyAvg
                )}ms)`
            );
            saveDelayStats();

            // กรอกชื่อแล้วค้นหา
            input.value = companyName;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));

            btnSearch.click();
            console.log("🔎 กดค้นหาลูกค้าแล้ว กำลังรอผล...");

            // คำนวณเวลารอผล search
            let searchWait = CFG.resultWait;

            if (CFG.delayMode === "auto") {
                // Intelligent Delay เฉพาะโหมด auto
                if (runtimeStats.popupReadyAvg != null) {
                    if (runtimeStats.popupReadyAvg < 600) {
                        searchWait = Math.max(
                            300,
                            Math.round(CFG.resultWait * 0.7)
                        );
                    } else if (runtimeStats.popupReadyAvg > 2000) {
                        searchWait = Math.round(CFG.resultWait * 1.4);
                    }
                }
                if (retryCount > 0) {
                    searchWait = Math.round(
                        searchWait * (1 + 0.3 * retryCount)
                    );
                }
            } else {
                // manual mode: ใช้ resultWait ตรง ๆ ไม่ปรับ auto
                searchWait = CFG.resultWait;
                // ถ้าอยากให้ retry นานขึ้นก็ได้ แต่ตอนนี้ทำแบบตรง ๆ ที่สุด
            }

            console.log(
                `⏳ รอผลค้นหา ~${searchWait}ms (mode=${CFG.delayMode}, base=${CFG.resultWait})`
            );

            setTimeout(() => {
                let selectedText = "";
                if (ddl.selectedIndex >= 0 && ddl.options.length > 0) {
                    selectedText = normalizeText(
                        ddl.options[ddl.selectedIndex].text
                    );
                }

                console.log(
                    "🔎 ผลลัพธ์ค้นหา (normalized):",
                    selectedText || "(ไม่มีตัวเลือก)"
                );

                // Smart Retry ถ้า dropdown ไม่มี options หรือไม่มี selection
                const noOptions = !ddl.options || ddl.options.length === 0;
                const noSelection = !selectedText;

                if ((noOptions || noSelection) && retryCount < maxRetry) {
                    console.warn(
                        `⚠️ ผลค้นหาอาจยังไม่พร้อม (noOptions=${noOptions}, noSelection=${noSelection}) → retry...`
                    );
                    startCustomerSearchFlow(
                        companyName,
                        retryCount + 1,
                        maxRetry
                    );
                    return;
                }

                if (selectedText === normalizeText("ไม่พบข้อมูล")) {
                    autoAddNewCustomer(companyName);
                } else {
                    const btnSelect = document.getElementById(
                        "cphContent_btnSelectCusName"
                    );
                    if (btnSelect) {
                        btnSelect.click();
                        console.log("✔ พบลูกค้า → กด Select ให้แล้ว");
                    } else {
                        console.warn("⚠️ มีผลลัพธ์ แต่ไม่เจอปุ่ม Select ลูกค้า");
                    }
                }
            }, searchWait);

            return;
        }

        if (counter * pollDelay > maxWait) {
            clearInterval(popupChecker);
            console.warn(
                "❌ Timeout: popup ค้นหาลูกค้าไม่พร้อมทำงาน (รอนานเกินค่าที่ตั้งไว้)"
            );
        }
    }, pollDelay);
}

// ---------- MAIN: กรอก form + Auto Customer ----------

function runWriterProcess() {
    if (!location.href.includes("CreateDoc.aspx")) {
        console.log("CostSheet Writer: ไม่ใช่หน้า CreateDoc.aspx ข้าม...");
        return;
    }

    chrome.storage.local.get(["dealData", "settings"], (result) => {
        if (!result.dealData) {
            console.log("CostSheet Writer: ไม่พบ dealData ใน storage");
            return;
        }

        const deal = result.dealData;
        CFG = sanitizeConfig(result.settings);

        console.log(
            "CostSheet Writer: เริ่มกรอกด้วย CFG:",
            CFG,
            "delayMode=",
            CFG.delayMode,
            "deal:",
            deal
        );

        const retryDelay = CFG.dropdownDelay * 2;

        // 1) Text fields
        if (deal.id) {
            const el = safeGet("cphContent_txtDealNo", "Deal No");
            if (el && el.value !== deal.id) {
                el.value = deal.id;
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }

        if (deal.period && deal.period !== "0") {
            const el = safeGet("cphContent_txtContractPeriod", "Contract Period");
            if (el && el.value !== deal.period) {
                el.value = deal.period;
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }

        const startDateInput = safeGet(
            "cphContent_txtContractStartDate",
            "Contract Start Date"
        );
        if (startDateInput) {
            const newVal = getTomorrowDate();
            if (startDateInput.value !== newVal) {
                startDateInput.value = newVal;
                startDateInput.focus();
                startDateInput.dispatchEvent(
                    new Event("input", { bubbles: true })
                );
                startDateInput.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
                setTimeout(() => startDateInput.blur(), CFG.clickDelay);
            }
        }

        // 2) Dropdowns + Smart Retry
        if (deal.owner) {
            const res = checkAndSetDropdown(
                "cphContent_ddlSalename",
                deal.owner,
                "Sale Name"
            );
            if (!res.hasOptions) {
                console.log(
                    `⏳ Sale Name dropdown ยังไม่มี options → รอ ${retryDelay}ms แล้ว runWriterProcess ใหม่`
                );
                setTimeout(runWriterProcess, retryDelay);
                return;
            }
            if (res.changed) {
                console.log(
                    `⏳ เปลี่ยน Sale Name แล้ว รอ ${retryDelay}ms แล้ว runWriterProcess ใหม่`
                );
                setTimeout(runWriterProcess, retryDelay);
                return;
            }
        }

        if (deal.type) {
            const res = checkAndSetDropdown(
                "cphContent_ddlDocType",
                deal.type,
                "Deal Type"
            );
            if (!res.hasOptions) {
                console.log(
                    `⏳ Deal Type dropdown ยังไม่มี options → รอ ${retryDelay}ms แล้ว runWriterProcess ใหม่`
                );
                setTimeout(runWriterProcess, retryDelay);
                return;
            }
            if (res.changed) {
                console.log(
                    `⏳ เปลี่ยน Deal Type แล้ว รอ ${retryDelay}ms แล้ว runWriterProcess ใหม่`
                );
                setTimeout(runWriterProcess, retryDelay);
                return;
            }
        }

        // 3) Auto customer
        if (deal.company) {
            startCustomerSearchFlow(deal.company.trim(), 0, 2);
        } else {
            console.log("ℹ️ deal.company ว่าง จึงไม่ auto ค้นหาลูกค้า");
        }
    });
}

// ---------- start ----------

chrome.storage.local.get(["userSettings", "settings"], (res) => {
    const saved =
        res.settings ||
        (res.userSettings
            ? { delayMode: "auto", startDelay: res.userSettings.startupDelay }
            : null);

    CFG = sanitizeConfig(saved);
    console.log(
        `⏳ CostSheet Writer: จะเริ่มทำงานใน ${CFG.startDelay}ms ด้วย CFG:`,
        CFG
    );
    setTimeout(runWriterProcess, CFG.startDelay);
});