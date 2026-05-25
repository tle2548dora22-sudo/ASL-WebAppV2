/* ═══════════════════════════════════════
   main.js — Entry point (English-only)
   ═══════════════════════════════════════ */

import { initNav } from "./nav.js";
import { t }       from "./i18n.js";
import {
  loadSentenceState,
  renderHistory,
  setStatus,
  addWordToSentence,
} from "./sentence.js";
import { initClips, renderClips } from "./clips.js";
import { isLoggedIn, showLoginScreen, showApp } from "./login.js";
import { isDemoMode, blockIfDemo } from "./demo.js";
import { setOnPrediction, setOnStatus } from "./gesture.js";
import { setDetectionMode, getDetectionMode } from "./camera.js";

/* Language is always English */
const lang = "en";
window.__lang__ = lang;

/* ─── [8] Render warm-up ping ─── */
let _warmupDone = false;
async function warmupServer() {
  if (_warmupDone) return;
  const { API_URL } = await import("./config.js");
  const healthUrl = API_URL.replace(/\/predict.*$/, "/health");
  const warmupBar  = document.getElementById("warmupBar");
  const warmupText = document.getElementById("warmupText");

  try {
    if (warmupBar)  warmupBar.style.display = "flex";
    if (warmupText) warmupText.textContent  = t(lang, "warmingUp");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    await fetch(healthUrl, { method: "GET", signal: controller.signal }).catch(() =>
      fetch(API_URL.replace(/\/predict.*$/, "/"), { method: "GET", signal: controller.signal })
    );
    clearTimeout(timer);
  } catch (_) {
    // Silently ignore — server may not have /health
  } finally {
    _warmupDone = true;
    if (warmupBar) {
      warmupBar.style.opacity = "0";
      setTimeout(() => { if (warmupBar) warmupBar.style.display = "none"; }, 500);
    }
  }
}

/* changeLanguage kept for compatibility but always sets English */
export function changeLanguage(_l) {
  window.__lang__ = "en";
  document.documentElement.lang = "en";

  _setText("navSectionMain",       t(lang, "navMenu"));
  _setText("navLabelHome",         t(lang, "navHome"));
  _setText("navLabelClips",        t(lang, "navClips"));
  _setText("labelCurrentLetter",   t(lang, "currentLetter"));
  _setText("labelDynamicGesture",  t(lang, "dynamicGesture"));
  _setText("sentenceSectionTitle", t(lang, "sentenceTitle"));
  _setText("historySectionTitle",  t(lang, "history"));
  _setText("skeletonHintText",     t(lang, "skeletonHint").replace("👋 ", ""));
  _setText("btnAddSpace",          t(lang, "btnAddSpace"));
  _setText("btnDelete",            t(lang, "btnDelete"));
  _setText("btnClear",             t(lang, "btnClear"));
  _setText("btnSpeak",             t(lang, "btnSpeak"));
  _setText("btnSave",              t(lang, "btnSave"));
  _setText("btnStopCameraLabel",   t(lang, "btnStopCamera"));
  _setText("btnLogoutLabel",       t(lang, "btnLogout"));
  _setText("permTitle",            t(lang, "permTitle"));
  _setText("permBody",             t(lang, "permBody").replace(/"/g, '"'));
  _setText("btnStartCameraOverlay",t(lang, "btnStartCameraOverlay"));
  _setText("clipsTitle",           t(lang, "clipsTitle"));
  _setText("clipsSubtitle",        t(lang, "clipsSubtitle"));
  _setText("btnModalPlay",         t(lang, "clipModalPlay"));
  _setText("btnModalFullscreen",   t(lang, "clipModalFullscreen"));
  _setText("btnModalClose",        t(lang, "clipModalClose"));
  _setText("loginSubtitle",        t(lang, "loginSubtitle"));
  _setText("labelEmail",           t(lang, "loginEmail"));
  _setText("labelPassword",        t(lang, "loginPassword"));
  _setText("loginForgotLink",      t(lang, "loginForgot"));
  _setText("loginBtnLabel",        t(lang, "loginBtn"));
  _setText("registerBtnLabel",     t(lang, "loginRegister"));
  _setText("loginOrLabel",         t(lang, "loginOr"));
  _setText("badgeSafe",            t(lang, "loginBadgeSafe"));
  _setText("badgeASL",             t(lang, "loginBadgeASL"));
  _setText("badgeRealtime",        t(lang, "loginBadgeRealtime"));

  const startBtnLabel = document.getElementById("startBtnLabel");
  if (startBtnLabel) startBtnLabel.textContent = t(lang, "btnStartCamera").replace("▶ ", "");

  const badge = document.getElementById("systemBadge");
  if (badge && badge.dataset.i18nKey) badge.textContent = t(lang, badge.dataset.i18nKey);

  renderHistory(lang);
  renderClips();
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setupGestureCallbacks() {
  setOnStatus(msg => { if (msg) setStatus(msg); });

  setOnPrediction(({ prediction, confidence }) => {
    const word = String(prediction || "").trim();
    if (!word) return;

    const currentLetterEl = document.getElementById("currentLetter");
    const confidenceEl    = document.getElementById("confidenceText");
    const labelEl         = document.getElementById("labelCurrentLetter");
    const barWrap         = document.getElementById("confidenceBarWrap");
    const barFill         = document.getElementById("confidenceBarFill");
    const skeletonHint    = document.getElementById("skeletonHint");

    if (labelEl)         labelEl.textContent         = t(lang, "dynamicGesture");
    if (currentLetterEl) animateLetter(currentLetterEl, word);
    if (confidenceEl)    confidenceEl.textContent    = `${t(lang, "confidence")}: ${(confidence * 100).toFixed(1)}%`;
    if (barWrap) barWrap.style.display = "block";
    if (barFill) {
      barFill.style.width      = `${Math.round(confidence * 100)}%`;
      barFill.style.background = confidence > 0.75 ? "var(--green)" : confidence > 0.5 ? "var(--yellow)" : "var(--red)";
    }
    if (skeletonHint) skeletonHint.classList.add("hidden");

    addWordToSentence(word);
  });
}

/* [7] Animate letter prediction */
let _lastLetter = "";
export function animateLetter(el, newLetter) {
  if (!el) return;
  if (newLetter === _lastLetter) return;
  _lastLetter = newLetter;

  el.classList.remove("letter-enter");
  void el.offsetWidth;
  el.textContent = newLetter;
  el.classList.add("letter-enter");
  setTimeout(() => el.classList.remove("letter-enter"), 320);
}
window.animateLetter = animateLetter;

function setupModeUI() {
  const currentMode  = getDetectionMode();
  const cameraCard   = document.querySelector("#page-home .card");
  const allControls  = cameraCard ? cameraCard.querySelectorAll(".controls") : [];
  const targetControls = allControls[0];

  if (targetControls && !document.getElementById("modeBtn-static")) {
    const group = document.createElement("div");
    group.className = "mode-toggle-group";
    group.innerHTML = `
      <span class="mode-label" id="modeLabelEl">${t(lang, "modeLabel")}</span>
      <button id="modeBtn-static"  class="btn-mode" type="button" onclick="setDetectionMode('static')" aria-label="Static A-Z mode">${t(lang, "modeStatic")}</button>
      <button id="modeBtn-dynamic" class="btn-mode" type="button" onclick="setDetectionMode('dynamic')" aria-label="Dynamic gesture mode">${t(lang, "modeDynamic")}</button>
      <button id="modeBtn-both"    class="btn-mode" type="button" onclick="setDetectionMode('both')" aria-label="Both A-Z and dynamic mode">${t(lang, "modeBoth")}</button>
    `;
    targetControls.appendChild(group);
  }
  updateModeButtons(currentMode);
}

function updateModeButtons(mode) {
  ["static", "dynamic", "both"].forEach(m => {
    const btn = document.getElementById(`modeBtn-${m}`);
    if (btn) btn.classList.toggle("btn-mode-active", m === mode);
  });
}

const _origSetMode = window.setDetectionMode || setDetectionMode;
window.setDetectionMode = mode => { _origSetMode(mode); updateModeButtons(mode); };

/* [6] Camera skeleton show/hide helpers */
export function showCameraSkeleton() {
  const skeleton  = document.getElementById("cameraSkeleton");
  const cameraBox = document.getElementById("cameraBox");
  const offState  = document.getElementById("cameraOffState");
  if (skeleton)  skeleton.style.display = "flex";
  if (cameraBox) cameraBox.style.display = "none";
  if (offState)  offState.style.display  = "none";
}
export function hideCameraSkeleton(success = true) {
  const skeleton  = document.getElementById("cameraSkeleton");
  const cameraBox = document.getElementById("cameraBox");
  const offState  = document.getElementById("cameraOffState");
  if (skeleton) skeleton.style.display = "none";
  if (success) {
    if (cameraBox) cameraBox.style.display = "block";
    if (offState)  offState.style.display  = "none";
  } else {
    if (cameraBox) cameraBox.style.display = "none";
    if (offState)  offState.style.display  = "flex";
  }
}
window.showCameraSkeleton = showCameraSkeleton;
window.hideCameraSkeleton = hideCameraSkeleton;

async function init() {
  setupGestureCallbacks();

  if (!isLoggedIn() && !isDemoMode()) {
    return;
  }
}

export async function initApp() {
  if (window.__aslAppReady) { showApp(); return; }
  window.__aslAppReady = true;

  showApp();
  loadSentenceState();
  initNav();
  setupModeUI();
  changeLanguage("en");
  initClips();

  // [8] Warm-up ping (once, non-blocking)
  setTimeout(warmupServer, 1500);

  if (typeof window.__onAppReady__ === "function") window.__onAppReady__();
}

window.changeLanguage = changeLanguage;
window.__initApp__    = initApp;

init();
