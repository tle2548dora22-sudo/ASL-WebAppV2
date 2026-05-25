/* ═══════════════════════════════════════
   config.js — ค่าคงที่และ API config
   แก้ไขที่นี่เพื่อเปลี่ยน endpoint / sensitivity
   ═══════════════════════════════════════ */

export const API_URL              = "https://explaining-cattle-advertise-copyrights.trycloudflare.com/predict";
export const USE_MIRROR_LANDMARKS = true;
export const REQUIRED_SAME_COUNT  = 3;       // จำนวนครั้งที่เห็นตัวอักษรเดิมก่อนยืนยัน
export const MIN_CONFIDENCE       = 0.60;    // ความมั่นใจขั้นต่ำ (0–1)
export const SEND_INTERVAL_MS     = 350;     // ความถี่ส่ง landmark (ms)
export const ACCEPT_COOLDOWN_MS   = 800;     // cooldown หลังรับตัวอักษร (ms)
export const API_TIMEOUT_MS       = 8000;    // timeout การเรียก API (ms)

/*
 * ════════════════════════════════════════════════════════
 *  SECURITY NOTE — Admin Password
 * ════════════════════════════════════════════════════════
 *  รหัสผ่านนี้อยู่ใน client-side เหมาะสำหรับ DEMO เท่านั้น
 *  Production ควรใช้ Firebase Auth / Supabase Auth
 * ════════════════════════════════════════════════════════
 */
export const ADMIN_PASSWORD = "048061"; // DEMO ONLY
