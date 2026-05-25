/* ═══════════════════════════════════════
   demo.js — Demo Mode state helpers
   Uses sessionStorage so it resets on browser close.
   ═══════════════════════════════════════ */

const SESSION_KEY = "asl_demo_mode";

/* ── State ── */
export function isDemoMode() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function enterDemoMode() {
  sessionStorage.setItem(SESSION_KEY, "1");
  document.body.classList.add("demo-mode");
  _renderDemoBanner();
  _warmupBackend();
}

export function exitDemoMode() {
  sessionStorage.removeItem(SESSION_KEY);
  document.body.classList.remove("demo-mode");
  const banner = document.getElementById("demoBanner");
  if (banner) banner.remove();
}

/* ── Auth guard ──
   Returns true if the action should proceed
   (either real user logged in, or demo mode active). */
export function requireAuthOrDemo() {
  return isDemoMode();   // caller also checks isLoggedIn() separately
}

/* ── Firebase write guard ──
   Call before any Firestore/auth write in demo mode.
   Returns true = blocked, shows prompt.
   Returns false = safe to proceed.                   */
export function blockIfDemo(actionLabel = "This feature") {
  if (!isDemoMode()) return false;
  _showDemoPrompt(actionLabel);
  return true;
}

/* ── Backend warm-up (runs once per session) ── */
let _warmupDone = false;

export async function _warmupBackend() {
  if (_warmupDone) return;
  _warmupDone = true;

  const warmupBar  = document.getElementById("warmupBar");
  const warmupText = document.getElementById("warmupText");

  try {
    if (warmupBar)  warmupBar.style.display = "flex";
    if (warmupText) warmupText.textContent  = "Warming up AI server…";

    /* Dynamic import so config.js isn't pulled in before DOM ready */
    const { API_URL } = await import("./config.js");
    const healthUrl = API_URL.replace(/\/predict.*$/, "/health");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    await fetch(healthUrl, { method: "GET", signal: controller.signal })
      .catch(() =>
        fetch(API_URL.replace(/\/predict.*$/, "/"), { method: "GET", signal: controller.signal })
      );
    clearTimeout(timer);

    if (warmupText) warmupText.textContent = "✅ AI server ready";
  } catch (_) {
    const warmupText = document.getElementById("warmupText");
    if (warmupText) warmupText.textContent = "Server may take a few seconds on first prediction";
  } finally {
    const warmupBar = document.getElementById("warmupBar");
    if (warmupBar) {
      warmupBar.style.opacity = "0";
      setTimeout(() => {
        if (warmupBar) warmupBar.style.display = "none";
        warmupBar.style.opacity = "1";
      }, 2000);
    }
  }
}

/* ── Demo banner injected into topbar ── */
function _renderDemoBanner() {
  if (document.getElementById("demoBanner")) return;

  const banner = document.createElement("div");
  banner.id = "demoBanner";
  banner.className = "demo-banner";
  banner.setAttribute("role", "status");
  banner.setAttribute("aria-label", "Demo mode active");
  banner.innerHTML = `
    <span class="demo-badge-pill">
      <i class="ti ti-flask" aria-hidden="true"></i>
      Demo Mode
    </span>
    <span class="demo-banner-text">Some features require an account.</span>
    <button class="demo-login-cta" onclick="window.__exitDemoAndLogin__()" aria-label="Log in to save your progress">
      <i class="ti ti-login" aria-hidden="true"></i>
      Log in to save progress
    </button>
    <button class="demo-banner-close" onclick="window.__exitDemoAndLogin__()" aria-label="Exit demo mode">
      ✕
    </button>
  `;

  /* Prepend to body — banner is fixed-positioned via CSS */
  document.body.prepend(banner);

  /* Show demo user label in topbar */
  const userEl = document.getElementById("loggedInUser");
  if (userEl) userEl.textContent = "Demo User";

  /* Replace logout button with "Exit Demo" */
  const logoutBtn = document.getElementById("btnLogoutLabel");
  if (logoutBtn) {
    logoutBtn.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i><span>Exit Demo</span>';
    logoutBtn.onclick = window.__exitDemoAndLogin__;
  }
}

/* ── Login prompt shown when a blocked action is triggered ── */
function _showDemoPrompt(actionLabel) {
  /* Reuse status text area for brief message */
  const statusEl = document.getElementById("statusText");
  if (statusEl) {
    statusEl.textContent = `🔒 ${actionLabel} requires an account. Click "Log in to save progress".`;
    setTimeout(() => {
      if (statusEl.textContent.startsWith("🔒")) statusEl.textContent = "";
    }, 3500);
  }
}

/* Global helper called by banner buttons */
window.__exitDemoAndLogin__ = function () {
  exitDemoMode();
  /* Trigger login screen via login.js */
  if (typeof window.doLogout === "function") {
    window.doLogout();
  } else {
    const appShell     = document.getElementById("appShell");
    const loginOverlay = document.getElementById("loginOverlay");
    if (appShell)     appShell.style.display     = "none";
    if (loginOverlay) loginOverlay.style.display = "flex";
  }
};
