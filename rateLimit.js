/* ═══════════════════════════════════════
   rateLimit.js — Client-side login rate limiter
   ป้องกัน brute-force: max 5 attempts / 60 sec
   ═══════════════════════════════════════ */

const MAX_ATTEMPTS  = 5;          // ครั้งสูงสุด
const WINDOW_MS     = 60 * 1000;  // 60 วินาที
const BLOCK_MS      = 60 * 1000;  // บล็อค 60 วินาที

const STORAGE_KEY_ATTEMPTS = "asl_rl_attempts";
const STORAGE_KEY_BLOCK    = "asl_rl_block_until";

/** ตรวจว่าบล็อคอยู่ไหม
 *  @returns {number} ms ที่เหลือ (0 = ไม่ถูกบล็อค) */
export function getRemainingBlock() {
  try {
    const until = parseInt(localStorage.getItem(STORAGE_KEY_BLOCK) || "0", 10);
    const now   = Date.now();
    return until > now ? until - now : 0;
  } catch (_) { return 0; }
}

/** บันทึก attempt และตรวจว่าควรบล็อคไหม
 *  @returns {{ blocked: boolean, remaining: number, attemptsLeft: number }} */
export function recordAttempt() {
  try {
    const now = Date.now();

    // อยู่ในช่วงบล็อคแล้ว
    const blockRemain = getRemainingBlock();
    if (blockRemain > 0) {
      return { blocked: true, remaining: blockRemain, attemptsLeft: 0 };
    }

    // โหลด attempts array (timestamp)
    let attempts = JSON.parse(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || "[]");

    // กรองเฉพาะ attempts ภายใน WINDOW_MS
    attempts = attempts.filter(ts => now - ts < WINDOW_MS);

    // เพิ่ม attempt ปัจจุบัน
    attempts.push(now);
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));

    if (attempts.length >= MAX_ATTEMPTS) {
      // ตั้งเวลาบล็อค
      const blockUntil = now + BLOCK_MS;
      localStorage.setItem(STORAGE_KEY_BLOCK, String(blockUntil));
      localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
      return { blocked: true, remaining: BLOCK_MS, attemptsLeft: 0 };
    }

    return {
      blocked:      false,
      remaining:    0,
      attemptsLeft: MAX_ATTEMPTS - attempts.length,
    };
  } catch (_) {
    return { blocked: false, remaining: 0, attemptsLeft: MAX_ATTEMPTS };
  }
}

/** รีเซ็ต (เมื่อ login สำเร็จ) */
export function resetAttempts() {
  try {
    localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
    localStorage.removeItem(STORAGE_KEY_BLOCK);
  } catch (_) {}
}

/** คืน string แสดงเวลาที่เหลือ "1:23" */
export function formatRemaining(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}`;
}
