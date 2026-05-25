/* ═══════════════════════════════════════
   admin.js — stub (Admin UI ถูกเอาออกแล้ว)
   clips จัดการผ่าน CLIPS array ใน clips.js
   ไฟล์นี้เก็บไว้เพื่อไม่ให้ import ใน main.js พัง
   ═══════════════════════════════════════ */

export let isAdmin = false;

/** ยังคงไว้เผื่อ main.js / login.js เรียก */
export function autoAdminLogin() {
  isAdmin = true;
  document.body.classList.add("admin-mode");
}

export function adminLogout() {
  isAdmin = false;
  document.body.classList.remove("admin-mode");
}
