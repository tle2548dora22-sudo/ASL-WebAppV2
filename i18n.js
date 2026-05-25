/* ═══════════════════════════════════════
   i18n.js — English-only UI strings
   Thai language support has been removed.
   ═══════════════════════════════════════ */

export const T = {
  en: {
    /* camera / status */
    ready:              "Ready",
    running:            "Running",
    stopped:            "Stopped",
    cameraOff:          "Camera off",
    live:               "Live",
    blocked:            "Blocked",
    loading:            "Loading hand detection…",
    cameraStarted:      "Camera started. Place your hand in the frame.",
    cameraStopped:      "Camera stopped.",
    noHand:             "No hand detected. Place your hand in the frame.",
    apiSuccess:         "AI connected.",
    apiTesting:         "Testing API…",
    apiFailed:          "API request failed — check connection and CORS.",
    lowConfidence:      "Confidence too low — not added",
    denied:             "Camera access denied. Please click Allow.",
    notFound:           "No camera found on this device.",
    notReadable:        "Camera may be in use by another app.",
    warmingUp:          "Warming up AI server…",

    /* sentence / tts */
    noTextSpeak:        "No text to speak.",
    noTextSave:         "No text to save.",
    saved:              "Saved to history.",
    currentLetter:      "Current Letter",
    noHistory:          "No history yet.",

    /* result panel */
    skeletonHint:       "👋 Place your hand in the frame to start detection",
    dynamicGesture:     "Dynamic Gesture",

    /* buttons */
    btnStartCamera:     "▶ Start Camera",
    btnStopCamera:      "⏹ Stop Camera",
    btnAddSpace:        "⎵ Space",
    btnDelete:          "⌫ Delete",
    btnClear:           "🗑 Clear",
    btnSpeak:           "🔊 Speak",
    btnSave:            "💾 Save",
    btnAutoSpeakOff:    "Auto Speak: Off",
    btnAutoSpeakOn:     "Auto Speak: On",
    btnLogout:          "🚪 Log out",

    /* permission overlay */
    permTitle:          "Camera Permission",
    permBody:           "This app needs camera access to detect ASL hand signs. Please click \"Allow\" when prompted by your browser.",
    btnStartCameraOverlay: "📷 Start Camera",

    /* sentence section */
    sentenceTitle:      "Current Sentence",

    /* nav */
    navMenu:            "Menu",
    navHome:            "Home",
    navClips:           "ASL Tutorial Clips",
    navLang:            "Language",

    /* login */
    loginEmail:         "Email",
    loginPassword:      "Password",
    loginForgot:        "Forgot password?",
    loginBtn:           "Log in",
    loginRegister:      "Create account",
    loginOr:            "or",
    loginHint:          "Sign in with your email and password. New here? Click Create account.",
    loginSubtitle:      "Sign in to continue",
    loginBadgeSafe:     "Secure",
    loginBadgeASL:      "ASL Detection",
    loginBadgeRealtime: "Real-time",

    /* clips */
    clipsTitle:         "🎬 ASL Tutorial Clips",
    clipsSubtitle:      "Video tutorials for ASL learners",
    clipsEmpty:         "No video clips yet",

    /* clip card */
    btnWatchClip:       "▶ Watch",
    clipModalClose:     "✕ Close",
    clipModalPlay:      "⏯ Play / Pause",
    clipModalFullscreen:"⛶ Fullscreen",
    clipVideo:          "Video",

    /* mode */
    modeLabel:          "Mode:",
    modeStatic:         "🔤 A–Z",
    modeDynamic:        "🤟 Dynamic",
    modeBoth:           "⚡ Both",
    modeStatusStatic:   "Mode: A–Z only",
    modeStatusDynamic:  "Mode: Dynamic only",
    modeStatusBoth:     "Mode: A–Z + Dynamic",

    /* confidence bar */
    confidence:         "Confidence",
    history:            "History",
  },
};

/* t() always resolves to English */
export function t(_lang, key) {
  return (T["en"] && T["en"][key]) || key;
}
