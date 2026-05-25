/* ═══════════════════════════════════════
   sentence.js — Sentence builder / TTS / History
   English-only UI strings
   ═══════════════════════════════════════ */

import { t } from "./i18n.js";
import { blockIfDemo } from "./demo.js";

export let sentence = "";
export let history  = [];

const sentenceEl    = document.getElementById("sentenceText");
const historyListEl = document.getElementById("historyList");
const statusEl      = document.getElementById("statusText");
const autoSpeakBtn  = document.getElementById("autoSpeakBtn");

export let autoSpeak = false;

export function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

let _saveTimer = null;

export function updateSentence() {
  if (sentenceEl) sentenceEl.textContent = sentence || "";

  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem("asl_current_sentence", sentence); } catch (_) {}
  }, 500);
}

export function addSpace() {
  if (sentence && !sentence.endsWith(" ")) {
    sentence += " ";
    updateSentence();
  }
}

export function deleteLast() {
  if (sentence.length > 0) {
    sentence = sentence.slice(0, -1);
    updateSentence();
  }
}

export function clearSentence() {
  sentence = "";
  updateSentence();
}

export function addLetterToSentence(letter) {
  if (!letter || letter === "-") return;

  sentence += String(letter).trim().toUpperCase();
  updateSentence();

  if (autoSpeak) speakText(letter, "en");

  const el = document.getElementById("currentLetter");
  if (el) {
    el.classList.add("pop");
    setTimeout(() => el.classList.remove("pop"), 150);
  }
}

export function addWordToSentence(word) {
  const clean = String(word || "").trim().replace(/_/g, " ");
  if (!clean || clean === "-") return;

  if (sentence && !sentence.endsWith(" ")) sentence += " ";
  sentence += clean + " ";
  updateSentence();

  const currentLetterEl = document.getElementById("currentLetter");
  if (currentLetterEl) {
    currentLetterEl.textContent = clean;
    currentLetterEl.classList.add("pop");
    setTimeout(() => currentLetterEl.classList.remove("pop"), 150);
  }

  if (autoSpeak) speakText(clean, "en");
}

/* ─── TTS ─── */
export function speakSentence(lang) {
  if (!sentence.trim()) {
    setStatus(t(lang, "noTextSpeak"));
    return;
  }
  speakText(sentence, lang);
  saveToHistory(lang);
}

export function speakText(text, _lang = "en") {
  if (!("speechSynthesis" in window)) {
    setStatus("Text-to-speech not supported in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = "en-US";
  utt.rate   = 0.9;
  window.speechSynthesis.speak(utt);
}

export function toggleAutoSpeak() {
  autoSpeak = !autoSpeak;

  if (autoSpeakBtn) {
    autoSpeakBtn.textContent = autoSpeak ? "Auto Speak: On" : "Auto Speak: Off";
    autoSpeakBtn.className   = autoSpeak ? "btn-green" : "btn-yellow";
  }

  try { localStorage.setItem("asl_auto_speak", autoSpeak ? "1" : "0"); } catch (_) {}
}

/* ─── History ─── */
export function saveToHistory(lang = "en") {
  const text = sentence.trim();

  if (!text) {
    setStatus(t(lang, "noTextSave"));
    return;
  }

  /* In demo mode: save locally but note it won't persist to cloud */
  if (blockIfDemo("Cloud history saving")) {
    /* Still save locally so UX is functional */
  }

  history.unshift({ text, time: new Date().toLocaleTimeString() });
  history = history.slice(0, 30);

  try { localStorage.setItem("asl_history", JSON.stringify(history)); } catch (_) {}

  renderHistory(lang);
  setStatus(t(lang, "saved"));
}

export function renderHistory(lang = "en") {
  if (!historyListEl) return;

  historyListEl.innerHTML = "";

  if (!history.length) {
    historyListEl.innerHTML = `<div class="small">${t(lang, "noHistory")}</div>`;
    return;
  }

  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div>${item.text}</div><div class="small">${item.time}</div>`;
    div.onclick   = () => { sentence = item.text; updateSentence(); };
    historyListEl.appendChild(div);
  });
}

export function loadSentenceState() {
  try {
    sentence  = localStorage.getItem("asl_current_sentence") || "";
    history   = JSON.parse(localStorage.getItem("asl_history") || "[]");
    autoSpeak = localStorage.getItem("asl_auto_speak") === "1";
  } catch (_) {
    sentence = ""; history = []; autoSpeak = false;
  }

  if (autoSpeakBtn) {
    autoSpeakBtn.textContent = autoSpeak ? "Auto Speak: On" : "Auto Speak: Off";
    autoSpeakBtn.className   = autoSpeak ? "btn-green" : "btn-yellow";
  }

  updateSentence();
}

window.addSpace        = addSpace;
window.deleteLast      = deleteLast;
window.clearSentence   = clearSentence;
window.speakSentence   = () => speakSentence("en");
window.toggleAutoSpeak = toggleAutoSpeak;
window.saveToHistory   = () => saveToHistory("en");
