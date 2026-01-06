// === popup.js (v5.4 - Note + Deal History + Local AI Phi3 with Timeout) ===
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
    if (status) status.textContent = "❌ ใช้ Tabs API ไม่ได้ (เช็ก permission)";
    return;
  }

  if (!tab || !tab.url) {
    const status = document.getElementById("status");
    if (status) status.textContent = "❌ ไม่พบแท็บปัจจุบัน";
    return;
  }

  // --------- DOM element refs ---------
  const btnCopy = document.getElementById("btnCopy");
  const btnDelete = document.getElementById("btnDelete");
  const statusDiv = document.getElementById("status");

  const dataCard = document.getElementById("dataCard");
  const storedCompany = document.getElementById("storedCompany");
  const noteTextarea = document.getElementById("dealNote");
  const btnSaveNote = document.getElementById("btnSaveNote");
  const btnAINote = document.getElementById("btnAINote");
  const btnCopyToDesc = document.getElementById("btnCopyToDesc");
  const noteStatus = document.getElementById("noteStatus");

  const historyToggle = document.getElementById("historyToggle");
  const historyContent = document.getElementById("historyContent");
  const historyArrow = document.getElementById("historyArrow");
  const historyList = document.getElementById("historyList");
  const historyEmpty = document.getElementById("historyEmpty");
  const btnClearHistory = document.getElementById("btnClearHistory");

  let currentDealId = null;

  function showNoteStatus(msg) {
    if (!noteStatus) return;
    noteStatus.textContent = msg || "บันทึกแล้ว";
    noteStatus.classList.remove("hidden");
    setTimeout(() => noteStatus.classList.add("hidden"), 1500);
  }

  // TODO: [REFACTOR] Move formatShortTime() to shared utils.js
  function formatShortTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const hr = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${mon} ${hr}:${min}`;
  }

  // TODO: [REFACTOR] Move renderHistory() to shared utils.js
  // วาด history
  function renderHistory(history, notes) {
    if (!historyList || !historyEmpty) return;
    historyList.innerHTML = "";

    if (!history || history.length === 0) {
      historyEmpty.classList.remove("hidden");
      return;
    }
    historyEmpty.classList.add("hidden");

    history.forEach((h) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.dataset.dealId = h.id || "";

      const title = document.createElement("div");
      title.className = "history-title";
      const company = h.company || "(ไม่ระบุชื่อ)";
      const idText = h.id ? `#${h.id}` : "";
      title.textContent = `${company} ${idText}`;

      const sub = document.createElement("div");
      sub.className = "history-sub";
      const meta = [];
      if (h.type) meta.push(h.type);
      if (h.owner) meta.push(h.owner);
      if (h.period) meta.push(`ระยะ ${h.period}m`);
      sub.textContent = meta.join(" • ");

      const time = document.createElement("div");
      time.className = "history-time";
      time.textContent = `ดึงเมื่อ: ${formatShortTime(h.savedAt)}`;

      div.appendChild(title);
      div.appendChild(sub);
      div.appendChild(time);

      if (h.id && notes && notes[h.id]) {
        const noteFlag = document.createElement("div");
        noteFlag.className = "history-time";
        noteFlag.textContent = "มีโน้ตบันทึกไว้แล้ว";
        div.appendChild(noteFlag);
      }

      div.addEventListener("click", () => {
        if (!h.id && !h.company) return;
        const newDealData = {
          id: h.id || null,
          company: h.company || "",
          type: h.type || "",
          period: h.period || "",
          owner: h.owner || ""
        };
        chrome.storage.local.set({ dealData: newDealData }, () => {
          console.log("Loaded deal from history:", newDealData);
          updateUI();
        });
      });

      historyList.appendChild(div);
    });
  }

  // โหลดข้อมูลจาก storage มาลง UI
  function updateUI() {
    chrome.storage.local.get(["dealData", "dealNotes", "dealHistory"], (data) => {
      const deal = data.dealData || null;
      const notes = data.dealNotes || {};
      const history = data.dealHistory || [];

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
        if (dataCard) dataCard.classList.add("hidden");
        if (btnDelete) btnDelete.classList.add("hidden");
        if (storedCompany) storedCompany.textContent = "-";
        // ไม่ล้าง note เพราะยังใช้งาน note ได้ตลอด
        // โหลด general note ถ้ามี
        if (noteTextarea && notes["_general"]) {
          noteTextarea.value = notes["_general"];
        }
        currentDealId = null;
      }

      renderHistory(history, notes);
    });
  }
  updateUI();

  // บันทึกโน้ต
  if (btnSaveNote) {
    btnSaveNote.onclick = () => {
      const text = noteTextarea ? noteTextarea.value || "" : "";
      const noteKey = currentDealId || "_general"; // ใช้ _general ถ้าไม่มี dealId

      chrome.storage.local.get("dealNotes", (data) => {
        const notes = data.dealNotes || {};
        notes[noteKey] = text;
        chrome.storage.local.set({ dealNotes: notes }, () => {
          console.log("Saved note for:", noteKey);
          showNoteStatus("บันทึกโน้ตแล้ว");
          updateUI();
        });
      });
    };
  }

  // AI Note - ดึงข้อมูลจากหน้า SalesWiz โดยตรง
  if (btnAINote) {
    btnAINote.onclick = async () => {
      // ดึง settings
      const settings = await chrome.storage.local.get(["aiSettings"]);
      const aiSettings = settings.aiSettings || { provider: "none" };

      if (aiSettings.provider === "none") {
        alert("ยังไม่ได้ตั้งค่า AI Provider\n\nไปที่ Options Page เพื่อตั้งค่า");
        return;
      }

      // เช็กว่าอยู่หน้า SalesWiz Deal หรือไม่
      if (!tab.url.includes("saleswiz.uih.co.th/deal/detail/")) {
        // ถ้าไม่ใช่หน้า SalesWiz ให้ใช้ข้อมูลจาก storage
        const stored = await chrome.storage.local.get(["dealData"]);
        if (!stored.dealData) {
          alert("ไม่ได้อยู่หน้า SalesWiz และไม่มีข้อมูลดีลใน storage\n\nกรุณาไปที่หน้า SalesWiz Deal แล้วลองใหม่");
          return;
        }
        // ใช้ข้อมูลจาก storage
        await callAIWithDealData(stored.dealData, aiSettings, showNoteStatus, noteTextarea);
        return;
      }

      // ดึงข้อมูลจากหน้า SalesWiz โดยตรง
      showNoteStatus("กำลังอ่านข้อมูลจากหน้า SalesWiz...");

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // ดึงข้อมูลดีลพื้นฐาน (Updated to v3.0 logic for Wisible)
            let dealId = "";
            let companyName = "";
            let durationText = "0 Month";
            let dealType = "";
            let ownerName = "";
            let activities = [];

            // 1. Deal ID
            const urlMatch = window.location.href.match(/\/deal\/detail\/(\d+)/);
            if (urlMatch && urlMatch[1]) {
              dealId = urlMatch[1];
            } else {
              const dealIdEl = document.querySelector(".deal-id");
              if (dealIdEl) dealId = dealIdEl.innerText.replace(/[^0-9]/g, "");
            }

            // 2. Company
            const customerNameEl = document.querySelector(".customer-name a");
            if (customerNameEl) {
              companyName = customerNameEl.innerText.trim();
            } else {
              const companyIcon = document.querySelector("img[src*='icon_company_info']") ||
                document.querySelector("img[alt='company icon']");
              if (companyIcon && companyIcon.nextElementSibling) {
                companyName = companyIcon.nextElementSibling.innerText.trim();
              }
            }

            // 3. Metadata
            document.querySelectorAll("p.field-title, .field-title").forEach((t) => {
              const val = t.nextElementSibling;
              if (!val) return;
              const k = t.innerText.trim().toLowerCase();

              let valNode = t.nextElementSibling;
              let v = "";

              const getValue = (node) => {
                if (!node) return "";
                const input = node.querySelector("input");
                if (input) return input.value.trim();
                return node.innerText.trim();
              };

              v = getValue(valNode);

              if ((!v || v.length === 0) && valNode && valNode.nextElementSibling) {
                valNode = valNode.nextElementSibling;
                v = getValue(valNode);
              }

              if (k.includes("service duration")) durationText = v;
              if (k.includes("deal type")) dealType = v;
              if (k.includes("owner") || k.includes("contact person")) ownerName = v;
            });

            // Owner Fallback
            if (!ownerName) {
              const personNameEl = document.querySelector(".person-contact-detail .customer-name a");
              if (personNameEl) {
                ownerName = personNameEl.innerText.trim();
              }
            }

            // 4. Activities
            document.querySelectorAll("h4").forEach((h4) => {
              const text = h4.innerText.trim().toLowerCase();
              if (text.includes("next activit")) {
                const parent = h4.closest(".activities-types") || h4.parentElement?.parentElement;
                if (parent) {
                  parent.querySelectorAll(".activity-content p.title.card-text, .title.card-text, .card-text").forEach((item) => {
                    const itemText = item.innerText.trim();
                    if (itemText && itemText.length > 5) {
                      activities.push({ type: "next", text: itemText.substring(0, 500) });
                    }
                  });
                }
              } else if (text.includes("past activit")) {
                const parent = h4.closest(".activities-types") || h4.parentElement?.parentElement;
                if (parent) {
                  parent.querySelectorAll(".activity-content p.title.card-text, .title.card-text, .card-text").forEach((item, idx) => {
                    if (idx >= 10) return;
                    const itemText = item.innerText.trim();
                    if (itemText && itemText.length > 5) {
                      activities.push({ type: "past", text: itemText.substring(0, 500) });
                    }
                  });
                }
              }
            });

            return {
              id: dealId,
              company: companyName,
              period: durationText.split(" ")[0].trim(),
              type: dealType,
              owner: ownerName,
              activities: activities
            };
          }
        });

        const deal = results[0]?.result;
        if (!deal) {
          alert("ไม่สามารถดึงข้อมูลจากหน้านี้ได้");
          return;
        }

        console.log("🤖 ดึงข้อมูลสดจากหน้า SalesWiz:", deal);
        console.log("📋 Activities:", deal.activities.length, "รายการ");

        // เรียก AI
        await callAIWithDealData(deal, aiSettings, showNoteStatus, noteTextarea);

      } catch (err) {
        console.error("Error reading page:", err);
        alert("เกิดข้อผิดพลาดในการอ่านข้อมูลจากหน้า\n\n" + err.message);
      }
    };
  }

  // ฟังก์ชันเรียก AI
  async function callAIWithDealData(deal, aiSettings, showNoteStatus, noteTextarea) {
    // สร้าง prompt พร้อม activities
    let activitiesText = "";
    if (deal.activities && deal.activities.length > 0) {
      activitiesText = "\n\n=== กิจกรรม/ประวัติล่าสุดจาก SalesWiz ===\n" +
        deal.activities.map((a, i) => `${i + 1}. ${typeof a === 'string' ? a : a.text}`).join("\n");
    }

    const prompt =
      "คุณคือ Presales Engineer ช่วยสรุปดีลสำหรับใส่ช่อง Project Description ใน CostSheet\n\n" +
      "**คำสั่ง:**\n" +
      "1. อ่านข้อมูลกิจกรรม/ประวัติด้านล่างให้ละเอียด\n" +
      "2. ดึงข้อมูลสำคัญ เช่น:\n" +
      "   - Product/Service ที่ลูกค้าต้องการ (เช่น disk, bandwidth, cloud)\n" +
      "   - ราคา มูลค่า หรือ spec ที่กล่าวถึง\n" +
      "   - Task/งานที่ต้องทำ\n" +
      "   - Quotation หรือ Draft ที่สร้างไว้\n" +
      "3. สรุปเป็น bullet ภาษาไทย กระชับ\n" +
      "4. แยกหัวข้อ: \"ข้อมูลลูกค้า\" \"ความต้องการ/Requirement\" \"Product/Service\" \"มูลค่า/ราคา\" \"สถานะ\"\n" +
      "5. ถ้าไม่มีข้อมูลในหัวข้อใด ให้ข้ามไป\n\n" +
      "=== ข้อมูลดีลพื้นฐาน ===\n" +
      `ลูกค้า: ${deal.company || "-"}\n` +
      `ประเภท: ${deal.type || "-"}\n` +
      `ระยะสัญญา: ${deal.period || "-"} เดือน\n` +
      `Sale: ${deal.owner || "-"}` +
      activitiesText;

    console.log("🤖 AI Prompt - Activities count:", deal.activities ? deal.activities.length : 0);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      let answer = "";

      if (aiSettings.provider === "ollama") {
        showNoteStatus(`กำลังให้ AI (${aiSettings.ollamaModel || "phi3"}) ช่วยสรุปดีล...`);

        const res = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: aiSettings.ollamaModel || "phi3",
            prompt,
            stream: false
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Ollama HTTP " + res.status);

        const json = await res.json();
        answer = (json && json.response) ? json.response.trim() : "";

      } else if (aiSettings.provider === "groq") {
        if (!aiSettings.groqApiKey) {
          alert("ยังไม่ได้ใส่ Groq API Key\n\nไปที่ Options Page เพื่อใส่ API Key");
          return;
        }

        showNoteStatus(`กำลังให้ AI (Groq ${aiSettings.groqModel || "llama-3.1-8b-instant"}) ช่วยสรุปดีล...`);

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aiSettings.groqApiKey}`
          },
          body: JSON.stringify({
            model: aiSettings.groqModel || "llama-3.1-8b-instant",
            messages: [
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1024
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Groq HTTP ${res.status}: ${errBody}`);
        }

        const json = await res.json();
        answer = (json.choices && json.choices[0] && json.choices[0].message)
          ? json.choices[0].message.content.trim()
          : "";
      }

      if (!answer) throw new Error("ไม่ได้ข้อความจาก AI");

      if (noteTextarea) noteTextarea.value = answer;
      showNoteStatus(`สร้างโน้ตด้วย AI แล้ว แก้เพิ่มได้`);

    } catch (err) {
      clearTimeout(timeoutId);
      console.error("AI note error:", err);

      let errorMsg = `เรียก AI (${aiSettings.provider}) ไม่สำเร็จ\n`;
      if (err.name === "AbortError") {
        errorMsg += "⏱️ หมดเวลา (Timeout 30 วินาที)";
      } else {
        errorMsg += "รายละเอียด: " + err.message;
      }

      alert(errorMsg);
      showNoteStatus("ใช้ AI ไม่สำเร็จ");
    }
  }

  // ปุ่มดึงข้อมูลจาก SalesWiz
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
    if (statusDiv) statusDiv.textContent = "📍 Cost Sheet (Auto Fill กำลังจัดการให้)";
    if (btnCopy) btnCopy.classList.add("hidden");
  } else {
    if (statusDiv) statusDiv.textContent = "⚪ หน้าเว็บทั่วไป";
    if (btnCopy) btnCopy.classList.add("hidden");
  }

  // ลบ deal ปัจจุบัน
  if (btnDelete) {
    btnDelete.onclick = () => {
      chrome.storage.local.remove(["dealData"], () => {
        updateUI();
      });
    };
  }

  // Toggle History (เปิด/ปิด)
  if (historyToggle) {
    historyToggle.onclick = () => {
      if (historyContent) {
        const isHidden = historyContent.style.display === "none";
        historyContent.style.display = isHidden ? "block" : "none";
        if (historyArrow) historyArrow.textContent = isHidden ? "▲" : "▼";
      }
    };
  }

  // ล้างประวัติทั้งหมด
  if (btnClearHistory) {
    btnClearHistory.onclick = () => {
      if (confirm("ต้องการล้างประวัติดีลทั้งหมดหรือไม่?")) {
        chrome.storage.local.remove(["dealHistory"], () => {
          showNoteStatus("ล้างประวัติแล้ว");
          updateUI();
        });
      }
    };
  }

  // Copy Note ไปใส่ CostSheet (บันทึกไว้ให้ costsheet_writer ใช้)
  if (btnCopyToDesc) {
    btnCopyToDesc.onclick = () => {
      const noteText = noteTextarea ? noteTextarea.value : "";
      if (!noteText.trim()) {
        alert("ยังไม่มีโน้ตให้ copy\n\nลองพิมพ์หรือใช้ AI สรุปก่อน");
        return;
      }
      // บันทึก projectDescription ไว้ใน dealData
      chrome.storage.local.get("dealData", (data) => {
        const deal = data.dealData || {};
        deal.projectDescription = noteText;
        chrome.storage.local.set({ dealData: deal }, () => {
          showNoteStatus("✅ จะใส่ Project Description เมื่อเปิด CostSheet");
        });
      });
    };
  }
});