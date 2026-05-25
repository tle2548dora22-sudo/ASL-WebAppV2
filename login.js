/* ═══════════════════════════════════════
   login.js — Firebase Auth Login / Register / Logout
   English-only UI strings
   ═══════════════════════════════════════ */

import {
  registerUser,
  loginUser,
  logoutUser,
  observeAuth,
  getUserRole
} from "./firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase.js";
import {
  recordAttempt,
  getRemainingBlock,
  resetAttempts,
  formatRemaining,
} from "./rateLimit.js";
import { isDemoMode, exitDemoMode, enterDemoMode } from "./demo.js";

let currentFirebaseUser = null;
let currentRole = "user";
let authObserverStarted = false;

function $(id) {
  return document.getElementById(id);
}

function setLoginError(message = "") {
  const el = $("loginError");
  if (el) el.textContent = message;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getEmailInput()    { return $("loginUsername"); }
function getPasswordInput() { return $("loginPassword"); }

export function isLoggedIn()      { return !!currentFirebaseUser; }
export function currentUser()     { return currentFirebaseUser?.email || ""; }
export function currentUserRole() { return currentRole || "user"; }

export function showLoginScreen() {
  const loginOverlay = $("loginOverlay");
  const appShell     = $("appShell");
  const landingEl    = $("landingPage");
  if (landingEl)    landingEl.style.display    = "none";
  if (loginOverlay) loginOverlay.style.display = "flex";
  if (appShell)     appShell.style.display     = "none";

  setLoginError("");

  const emailInput    = getEmailInput();
  const passwordInput = getPasswordInput();
  if (emailInput)    emailInput.value    = "";
  if (passwordInput) passwordInput.value = "";

  document.body.classList.remove("admin-mode");
}

export function showApp() {
  const loginOverlay = $("loginOverlay");
  const appShell     = $("appShell");
  const loggedInUser = $("loggedInUser");

  if (loginOverlay) loginOverlay.style.display = "none";
  if (appShell)     appShell.style.display     = "block";
  if (loggedInUser) loggedInUser.textContent   = currentUser();

  if (currentRole === "admin") {
    document.body.classList.add("admin-mode");
    window.__autoAdmin__ = true;
  } else {
    document.body.classList.remove("admin-mode");
    window.__autoAdmin__ = false;
  }
}

export async function handleLogin() {
  const email    = normalizeEmail(getEmailInput()?.value);
  const password = getPasswordInput()?.value || "";

  if (!email || !password) {
    setLoginError("Please enter your email and password.");
    return;
  }

  /* ── Rate Limit ── */
  const blockMs = getRemainingBlock();
  if (blockMs > 0) {
    setLoginError(`⛔ Too many attempts. Please wait ${formatRemaining(blockMs)} seconds.`);
    return;
  }
  const rl = recordAttempt();
  if (rl.blocked) {
    setLoginError(`⛔ Too many attempts. Please wait ${formatRemaining(rl.remaining)} seconds.`);
    return;
  }

  try {
    setLoginError("Signing in…");
    await loginUser(email, password);
    resetAttempts();
    // onAuthStateChanged handles showApp + initApp
  } catch (err) {
    console.error("[login] login error:", err);
    const attemptsLeft = rl.attemptsLeft - 1;
    let msg = firebaseErrorToEnglish(err);
    if (attemptsLeft > 0) msg += ` (${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left)`;
    setLoginError(msg);

    const passwordInput = getPasswordInput();
    if (passwordInput) passwordInput.value = "";
  }
}

export async function handleRegister() {
  const email    = normalizeEmail(getEmailInput()?.value);
  const password = getPasswordInput()?.value || "";

  if (!email || !password) {
    setLoginError("Please enter your email and password before creating an account.");
    return;
  }

  if (password.length < 6) {
    setLoginError("Password must be at least 6 characters.");
    return;
  }

  try {
    setLoginError("Creating account…");
    await registerUser(email, password);
    // onAuthStateChanged handles showApp + initApp
  } catch (err) {
    console.error("[login] register error:", err);
    setLoginError(firebaseErrorToEnglish(err));
  }
}

export async function doLogout() {
  /* If in demo mode, just exit cleanly without Firebase signout */
  if (isDemoMode()) {
    exitDemoMode();
    currentFirebaseUser = null;
    currentRole = "user";
    window.__aslAppReady = false;
    showLoginScreen();
    return;
  }

  try {
    await logoutUser();
  } catch (err) {
    console.warn("[login] logout error:", err);
  }

  currentFirebaseUser = null;
  currentRole = "user";
  window.__aslAppReady = false;
  showLoginScreen();
}

/* ─── Demo Mode entry point ─── */
export function handleEnterDemo() {
  enterDemoMode();
  window.__aslAppReady = false;

  /* Show app shell immediately */
  const loginOverlay = document.getElementById("loginOverlay");
  const landingPage  = document.getElementById("landingPage");
  const appShell     = document.getElementById("appShell");
  if (loginOverlay) loginOverlay.style.display = "none";
  if (landingPage)  landingPage.style.display  = "none";
  if (appShell)     appShell.style.display     = "block";

  /* Boot the app as demo user */
  if (typeof window.__initApp__ === "function") {
    window.__initApp__();
  }
}
window.handleEnterDemo = handleEnterDemo;

export function initAuthObserver() {
  if (authObserverStarted) return;
  authObserverStarted = true;

  observeAuth(async (user) => {
    currentFirebaseUser = user || null;

    if (!user) {
      currentRole = "user";
      window.__aslAppReady = false;
      /* If demo mode is active, don't redirect to login */
      if (!isDemoMode()) showLoginScreen();
      return;
    }

    try {
      const role = await getUserRole(user.uid);
      currentRole = role || "user";
    } catch (err) {
      console.warn("[login] get role failed:", err);
      currentRole = "user";
    }

    showApp();

    if (typeof window.__initApp__ === "function") {
      await window.__initApp__();
    }
  });
}

function ensureRegisterButton() {
  const registerBtn = $("registerBtn");
  if (registerBtn) registerBtn.onclick = handleRegister;
}

function firebaseErrorToEnglish(err) {
  const code = err?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return err?.message || "Sign-in failed. Please try again.";
  }
}

export async function handleForgotPassword() {
  const email = normalizeEmail(getEmailInput()?.value);
  const msg   = $("loginError");

  if (!email) {
    if (msg) { msg.style.color = "var(--red)"; msg.textContent = "Please enter your email address first."; }
    getEmailInput()?.focus();
    return;
  }

  try {
    if (msg) { msg.style.color = "var(--accent)"; msg.textContent = "Sending reset email…"; }
    await sendPasswordResetEmail(auth, email);
    if (msg) { msg.style.color = "var(--green)"; msg.textContent = `✅ Reset link sent to ${email}. Check your inbox.`; }
  } catch (err) {
    console.error("[login] forgot password error:", err);
    const code = err?.code || "";
    let errMsg = "Unable to send reset email. Please try again.";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential")
      errMsg = "No account found with this email address.";
    else if (code === "auth/invalid-email")
      errMsg = "Invalid email address.";
    else if (code === "auth/too-many-requests")
      errMsg = "Too many requests. Please wait a moment.";
    if (msg) { msg.style.color = "var(--red)"; msg.textContent = errMsg; }
  }
}

window.handleLogin          = handleLogin;
window.handleRegister       = handleRegister;
window.doLogout             = doLogout;
window.handleForgotPassword = handleForgotPassword;

document.addEventListener("DOMContentLoaded", () => {
  ensureRegisterButton();
  initAuthObserver();
});
