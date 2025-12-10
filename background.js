// === background.js (v2.2 - Login Check + Keyboard Shortcut) ===

// --- Helper: เช็ก SalesWiz (ใช้ URL เหมือนเดิม) ---
async function checkSaleswizLogin() {
  try {
    const res = await fetch("https://saleswiz.uih.co.th/dashboard", {
      method: "GET",
      redirect: "follow",
      credentials: "include"
    });

    if (!res || res.type === "opaque") return null;
    const finalUrl = (res.url || "").toLowerCase();
    if (!finalUrl) return null;

    // ถ้าเด้งไป /login แสดงว่าหลุด
    if (finalUrl.includes("login")) return false;
    return true;
  } catch (e) {
    console.warn("checkSaleswizLogin error:", e);
    return null;
  }
}

// --- Helper: เช็ก CostSheet โดยดู HTML ฟอร์ม login ---
async function checkCostsheetLogin() {
  try {
    const res = await fetch("https://costsheet.uih.co.th/Default.aspx", {
      method: "GET",
      redirect: "follow",
      credentials: "include"
    });

    if (!res || res.type === "opaque") return null;

    const text = await res.text();

    // ถ้าใน HTML มีชื่อ field login เช่น Login_Container_txtUsername → แสดงว่าเป็นหน้า Login
    if (text.includes("Login_Container_txtUsername") ||
      text.includes("Login_Container$txtUsername")) {
      return false; // มีฟอร์ม login → ยังไม่ได้ล็อกอิน
    }

    // ถ้าไม่มีฟอร์ม login แสดงว่าน่าจะอยู่หน้าในระบบแล้ว
    return true;
  } catch (e) {
    console.warn("checkCostsheetLogin error:", e);
    return null;
  }
}

// ---------- KeepAlive ทุก 5 นาที ----------

chrome.alarms.create("keepAlive", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "keepAlive") return;

  chrome.storage.local.get(["salesCreds", "costCreds"], async (res) => {

    if (res.salesCreds) {
      const swLoggedIn = await checkSaleswizLogin();
      if (swLoggedIn === false) {
        chrome.tabs.create(
          { url: "https://saleswiz.uih.co.th/login#auto", active: false },
          (tab) => setTimeout(() => chrome.tabs.remove(tab.id), 15000)
        );
      }
    }

    if (res.costCreds) {
      const csLoggedIn = await checkCostsheetLogin();
      if (csLoggedIn === false) {
        chrome.tabs.create(
          { url: "https://costsheet.uih.co.th/Login.aspx#auto", active: false },
          (tab) => setTimeout(() => chrome.tabs.remove(tab.id), 15000)
        );
      }
    }
  });
});

// ---------- ใช้ตอบ popup: CHECK_LOGIN_STATUS ----------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CHECK_LOGIN_STATUS") {
    (async () => {
      const [saleswiz, costsheet] = await Promise.all([
        checkSaleswizLogin(),
        checkCostsheetLogin()
      ]);

      sendResponse({ saleswiz, costsheet });
    })();

    return true; // async response
  }
});

// ---------- Keyboard Shortcut: Ctrl+Shift+D (Mac: Cmd+Shift+D) ----------

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "copy-deal-data") {
    try {
      // หา active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab || !tab.url) {
        console.warn("Keyboard shortcut: ไม่พบ active tab");
        return;
      }

      // เช็กว่าอยู่หน้า SalesWiz Deal Detail หรือไม่
      if (tab.url.includes("saleswiz.uih.co.th/deal/detail/")) {
        console.log("⌨️ Keyboard shortcut: กำลังดึงข้อมูลจาก SalesWiz...");

        // รัน saleswiz_reader.js
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["saleswiz_reader.js"]
        });

        console.log("⌨️ Keyboard shortcut: ดึงข้อมูลสำเร็จ!");
      } else {
        console.log("⌨️ Keyboard shortcut: ไม่ใช่หน้า SalesWiz Deal Detail");
      }
    } catch (error) {
      console.error("Keyboard shortcut error:", error);
    }
  }
});