/* ═══════════════════════════════════════
   config.js — API config + sensitivity
   ═══════════════════════════════════════ */

/* Static gesture: A–Z */
export const API_URL              = "https://asl-api-yoo3.onrender.com/predict";
export const USE_MIRROR_LANDMARKS = true;
export const REQUIRED_SAME_COUNT  = 3;
export const MIN_CONFIDENCE       = 0.60;
export const SEND_INTERVAL_MS     = 350;
export const ACCEPT_COOLDOWN_MS   = 800;
export const API_TIMEOUT_MS       = 8000;

/* Dynamic gesture: HELLO, THANK_YOU, EAT, DRINK, ... */
export const DYNAMIC_API_URL          = "https://asl-api-yoo3.onrender.com/predict-gesture";
export const SEQUENCE_LENGTH          = 30;    // ตอนนี้ backend บน Render ยังต้องการ 30 frames
export const EARLY_CONFIDENCE         = 0.85;
export const DYNAMIC_MIN_CONFIDENCE   = 0.70;
export const DYNAMIC_COOLDOWN_MS      = 1200;
export const DYNAMIC_SEND_INTERVAL_MS = 200;
export const DYNAMIC_API_TIMEOUT_MS   = 8000;

/* SECURITY NOTE: ADMIN_PASSWORD ถูกเปลี่ยนเป็นระบบ Firebase role แล้ว
   admin.js ยังคง import ค่านี้ได้ แต่การตรวจสอบสิทธิ์จริงใช้ Firestore role field
   ไม่ควรใส่รหัสผ่านจริงที่นี่ในระบบ production */
export const ADMIN_PASSWORD = ""; // ใช้ Firebase role แทน
