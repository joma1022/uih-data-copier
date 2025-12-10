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
  const noteStatus = document.getElementById("noteStatus");

  const historyList = document.getElementById("historyList");
  const historyEmpty = document.getElementById("historyEmpty");

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
        if (noteTextarea) noteTextarea.value = "";
        currentDealId = null;
      }

      renderHistory(history, notes);
    });
  }
  updateUI();

  // บันทึกโน้ต
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
          updateUI();
        });
      });
    };
  }

  // AI Note (Phi-3 local ผ่าน /api/generate)
  if (btnAINote) {
    btnAINote.onclick = () => {
      chrome.storage.local.get("dealData", async (data) => {
        const deal = data.dealData;
        if (!deal) {
          alert("ยังไม่มีข้อมูลดีลในระบบ (ลองกด 🚀 ดึงข้อมูลจาก SalesWiz ก่อน)");
          return;
        }

        // สร้าง AbortController สำหรับ timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

        try {
          showNoteStatus("กำลังให้ AI (phi3) ช่วยสรุปดีล...");

          const prompt =
            "คุณคือ Presales Engineer ช่วยสรุปดีลให้ใช้ใส่ช่อง Note ใน CostSheet " +
            "ให้เป็น bullet ภาษาไทย กระชับ อ่านง่าย แยกหัวข้อ \"ข้อมูลลูกค้า\" และ \"ความต้องการหลัก\" และ \"สิ่งที่ต้องทำฝั่งเรา\" " +
            "ถ้า field บางอย่างไม่มีข้อมูลให้ข้ามไปได้เลย\n\n" +
            "ข้อมูลดีล (JSON):\n" +
            JSON.stringify(deal, null, 2);

          const res = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "phi3",
              prompt,
              stream: false
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) throw new Error("HTTP " + res.status);
          const json = await res.json();
          const answer = (json && json.response) ? json.response.trim() : "";

          if (!answer) throw new Error("ไม่ได้ข้อความจาก AI");

          if (noteTextarea) noteTextarea.value = answer;
          showNoteStatus("สร้างโน้ตด้วย AI (Phi-3) แล้ว แก้เพิ่มได้");
        } catch (err) {
          clearTimeout(timeoutId);
          console.error("AI note error:", err);

          let errorMsg = "เรียก AI จาก Ollama ไม่สำเร็จ\n";
          if (err.name === "AbortError") {
            errorMsg += "⏱️ หมดเวลา (Timeout 30 วินาที)\nลองเช็กว่า Ollama รันอยู่";
          } else {
            errorMsg += "ลองเช็กว่า Ollama รันอยู่ และมีโมเดล phi3 แล้ว\n\nรายละเอียด: " + err.message;
          }

          alert(errorMsg);
          showNoteStatus("ใช้ AI ไม่สำเร็จ");
        }
      });
    };
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
});