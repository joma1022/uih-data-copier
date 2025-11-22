// === options.js (v4 - Full Delay Control + Mode + Status) ===

const DEFAULT_CFG = {
  delayMode: "auto",          // "auto" | "manual"
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

function clamp(v, min, max, def) {
  if (typeof v !== "number" || Number.isNaN(v)) return def;
  return Math.min(max, Math.max(min, v));
}

function sanitizeSettings(raw) {
  const cfg = { ...DEFAULT_CFG, ...(raw || {}) };

  let mode = (cfg.delayMode || "auto").toLowerCase();
  if (mode !== "auto" && mode !== "manual") mode = "auto";

  return {
    delayMode:     mode,
    startDelay:     clamp(cfg.startDelay,     0,    60000, DEFAULT_CFG.startDelay),
    clickDelay:     clamp(cfg.clickDelay,     50,   5000,  DEFAULT_CFG.clickDelay),
    dropdownDelay:  clamp(cfg.dropdownDelay,  200,  10000, DEFAULT_CFG.dropdownDelay),
    popupWait:      clamp(cfg.popupWait,      200,  15000, DEFAULT_CFG.popupWait),
    resultWait:     clamp(cfg.resultWait,     300,  20000, DEFAULT_CFG.resultWait),
    popupPollDelay: clamp(cfg.popupPollDelay, 50,   5000,  DEFAULT_CFG.popupPollDelay),
    popupTimeout:   clamp(cfg.popupTimeout,   1000, 30000, DEFAULT_CFG.popupTimeout),
    addPollDelay:   clamp(cfg.addPollDelay,   50,   5000,  DEFAULT_CFG.addPollDelay),
    addTimeout:     clamp(cfg.addTimeout,     1000, 30000, DEFAULT_CFG.addTimeout)
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const delayModeEl     = document.getElementById("delayMode");
  const startDelayEl    = document.getElementById("startDelay");
  const clickDelayEl    = document.getElementById("clickDelay");
  const dropdownDelayEl = document.getElementById("dropdownDelay");
  const popupWaitEl     = document.getElementById("popupWait");
  const resultWaitEl    = document.getElementById("resultWait");
  const popupPollEl     = document.getElementById("popupPollDelay");
  const popupTimeoutEl  = document.getElementById("popupTimeout");
  const addPollEl       = document.getElementById("addPollDelay");
  const addTimeoutEl    = document.getElementById("addTimeout");

  const saveBtn   = document.getElementById("saveBtn");
  const statusDiv = document.getElementById("status");
  const autoStatusDiv = document.getElementById("autoStatus");

  // โหลด settings + สถานะ Auto Delay
  chrome.storage.local.get(["settings", "delayStats"], (res) => {
    const cfg = sanitizeSettings(res.settings);
    const stats = res.delayStats || {};

    delayModeEl.value    = cfg.delayMode;
    startDelayEl.value   = cfg.startDelay;
    clickDelayEl.value   = cfg.clickDelay;
    dropdownDelayEl.value= cfg.dropdownDelay;
    popupWaitEl.value    = cfg.popupWait;
    resultWaitEl.value   = cfg.resultWait;
    popupPollEl.value    = cfg.popupPollDelay;
    popupTimeoutEl.value = cfg.popupTimeout;
    addPollEl.value      = cfg.addPollDelay;
    addTimeoutEl.value   = cfg.addTimeout;

    // แสดงสถานะ Auto Delay
    const popupAvg = stats.popupReadyAvg != null
      ? `${Math.round(stats.popupReadyAvg)} ms`
      : "ยังไม่มีข้อมูล";
    const addAvg = stats.addFormReadyAvg != null
      ? `${Math.round(stats.addFormReadyAvg)} ms`
      : "ยังไม่มีข้อมูล";

    let updated = "";
    if (stats.updatedAt) {
      const d = new Date(stats.updatedAt);
      updated = d.toLocaleString();
    } else {
      updated = "ยังไม่เคยเก็บสถิติ";
    }

    const modeText =
      cfg.delayMode === "auto"
        ? "โหมดปัจจุบัน: AUTO (ใช้ Intelligent Delay)\n"
        : "โหมดปัจจุบัน: MANUAL (ใช้ค่าที่ตั้งตรง ๆ)\n";

    autoStatusDiv.textContent =
      modeText +
      `Popup Search Ready เฉลี่ย ~ ${popupAvg}\n` +
      `Add Customer Form Ready เฉลี่ย ~ ${addAvg}\n` +
      `อัปเดตล่าสุด: ${updated}`;
  });

  saveBtn.addEventListener("click", () => {
    const raw = {
      delayMode:     delayModeEl.value,
      startDelay:     parseInt(startDelayEl.value, 10),
      clickDelay:     parseInt(clickDelayEl.value, 10),
      dropdownDelay:  parseInt(dropdownDelayEl.value, 10),
      popupWait:      parseInt(popupWaitEl.value, 10),
      resultWait:     parseInt(resultWaitEl.value, 10),
      popupPollDelay: parseInt(popupPollEl.value, 10),
      popupTimeout:   parseInt(popupTimeoutEl.value, 10),
      addPollDelay:   parseInt(addPollEl.value, 10),
      addTimeout:     parseInt(addTimeoutEl.value, 10)
    };

    const cfg = sanitizeSettings(raw);

    chrome.storage.local.set({ settings: cfg }, () => {
      statusDiv.textContent = "✅ Saved";
      setTimeout(() => (statusDiv.textContent = ""), 1500);
      console.log("Settings saved:", cfg);
    });
  });
});