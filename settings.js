// === settings.js (v1.0 - AI Settings Handler) ===
document.addEventListener("DOMContentLoaded", () => {
    // DOM elements
    const aiProvider = document.getElementById("aiProvider");
    const ollamaSettings = document.getElementById("ollamaSettings");
    const ollamaModel = document.getElementById("ollamaModel");
    const groqSettings = document.getElementById("groqSettings");
    const groqModelSettings = document.getElementById("groqModelSettings");
    const groqApiKey = document.getElementById("groqApiKey");
    const groqModel = document.getElementById("groqModel");
    const saveBtn = document.getElementById("saveBtn");
    const status = document.getElementById("status");

    // Show/hide settings based on provider
    function updateSettingsVisibility() {
        const provider = aiProvider.value;

        ollamaSettings.style.display = provider === "ollama" ? "block" : "none";
        groqSettings.style.display = provider === "groq" ? "block" : "none";
        groqModelSettings.style.display = provider === "groq" ? "block" : "none";
    }

    // Load saved settings
    function loadSettings() {
        chrome.storage.local.get([
            "aiSettings",
            "costsheetWriterConfig",
            "autoDeleteSettings"
        ], (data) => {
            // AI Settings
            const ai = data.aiSettings || {};
            if (aiProvider) aiProvider.value = ai.provider || "none";
            if (ollamaModel) ollamaModel.value = ai.ollamaModel || "phi3";
            if (groqApiKey) groqApiKey.value = ai.groqApiKey || "";
            if (groqModel) groqModel.value = ai.groqModel || "llama-3.1-8b-instant";

            updateSettingsVisibility();

            // CostSheet Writer Config
            const cfg = data.costsheetWriterConfig || {};
            const delayMode = document.getElementById("delayMode");
            const startDelay = document.getElementById("startDelay");
            const clickDelay = document.getElementById("clickDelay");
            const dropdownDelay = document.getElementById("dropdownDelay");
            const popupWait = document.getElementById("popupWait");
            const resultWait = document.getElementById("resultWait");
            const popupPollDelay = document.getElementById("popupPollDelay");
            const popupTimeout = document.getElementById("popupTimeout");
            const addPollDelay = document.getElementById("addPollDelay");
            const addTimeout = document.getElementById("addTimeout");

            if (delayMode) delayMode.value = cfg.delayMode || "auto";
            if (startDelay) startDelay.value = cfg.startDelay ?? 1000;
            if (clickDelay) clickDelay.value = cfg.clickDelay ?? 200;
            if (dropdownDelay) dropdownDelay.value = cfg.dropdownDelay ?? 400;
            if (popupWait) popupWait.value = cfg.popupWait ?? 1500;
            if (resultWait) resultWait.value = cfg.resultWait ?? 500;
            if (popupPollDelay) popupPollDelay.value = cfg.popupPollDelay ?? 200;
            if (popupTimeout) popupTimeout.value = cfg.popupTimeout ?? 8000;
            if (addPollDelay) addPollDelay.value = cfg.addPollDelay ?? 200;
            if (addTimeout) addTimeout.value = cfg.addTimeout ?? 10000;

            // Auto-Delete Settings
            const autoDelete = data.autoDeleteSettings || {};
            const autoDeleteEnabled = document.getElementById("autoDeleteEnabled");
            const autoDeleteDelay = document.getElementById("autoDeleteDelay");
            if (autoDeleteEnabled) autoDeleteEnabled.checked = autoDelete.enabled || false;
            if (autoDeleteDelay) autoDeleteDelay.value = autoDelete.delaySeconds ?? 30;
        });

        // Load runtime stats
        chrome.storage.local.get("autoDelayStats", (data) => {
            const autoStatus = document.getElementById("autoStatus");
            if (!autoStatus) return;

            const stats = data.autoDelayStats;
            if (stats) {
                autoStatus.textContent =
                    `Popup Search: avg ~${stats.popupSearchAvg || 0}ms\n` +
                    `Result Wait: avg ~${stats.resultWaitAvg || 0}ms\n` +
                    `Last updated: ${stats.lastUpdated || "N/A"}`;
            }
        });
    }

    // Save settings
    function saveSettings() {
        const delayMode = document.getElementById("delayMode");
        const startDelay = document.getElementById("startDelay");
        const clickDelay = document.getElementById("clickDelay");
        const dropdownDelay = document.getElementById("dropdownDelay");
        const popupWait = document.getElementById("popupWait");
        const resultWait = document.getElementById("resultWait");
        const popupPollDelay = document.getElementById("popupPollDelay");
        const popupTimeout = document.getElementById("popupTimeout");
        const addPollDelay = document.getElementById("addPollDelay");
        const addTimeout = document.getElementById("addTimeout");

        const aiSettings = {
            provider: aiProvider ? aiProvider.value : "none",
            ollamaModel: ollamaModel ? ollamaModel.value : "phi3",
            groqApiKey: groqApiKey ? groqApiKey.value : "",
            groqModel: groqModel ? groqModel.value : "llama-3.1-8b-instant"
        };

        const costsheetWriterConfig = {
            delayMode: delayMode ? delayMode.value : "auto",
            startDelay: startDelay ? parseInt(startDelay.value) : 1000,
            clickDelay: clickDelay ? parseInt(clickDelay.value) : 200,
            dropdownDelay: dropdownDelay ? parseInt(dropdownDelay.value) : 400,
            popupWait: popupWait ? parseInt(popupWait.value) : 1500,
            resultWait: resultWait ? parseInt(resultWait.value) : 500,
            popupPollDelay: popupPollDelay ? parseInt(popupPollDelay.value) : 200,
            popupTimeout: popupTimeout ? parseInt(popupTimeout.value) : 8000,
            addPollDelay: addPollDelay ? parseInt(addPollDelay.value) : 200,
            addTimeout: addTimeout ? parseInt(addTimeout.value) : 10000
        };

        // Auto-Delete Settings
        const autoDeleteEnabled = document.getElementById("autoDeleteEnabled");
        const autoDeleteDelay = document.getElementById("autoDeleteDelay");
        const autoDeleteSettings = {
            enabled: autoDeleteEnabled ? autoDeleteEnabled.checked : false,
            delaySeconds: autoDeleteDelay ? parseInt(autoDeleteDelay.value) : 30
        };

        chrome.storage.local.set({
            aiSettings,
            costsheetWriterConfig,
            autoDeleteSettings
        }, () => {
            if (status) {
                status.textContent = "✅ บันทึกสำเร็จ!";
                status.style.color = "#28a745";
                setTimeout(() => {
                    status.textContent = "";
                }, 2000);
            }
        });
    }

    // Event listeners
    if (aiProvider) {
        aiProvider.addEventListener("change", updateSettingsVisibility);
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", saveSettings);
    }

    // Load on init
    loadSettings();
});
