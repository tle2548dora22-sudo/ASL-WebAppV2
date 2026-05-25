/* ═══════════════════════════════════════
   nav.js — Sidebar / Navigation logic
   ═══════════════════════════════════════ */

const sidenav     = document.getElementById("sidenav");
const mainContent = document.getElementById("mainContent");
const navBackdrop = document.getElementById("navBackdrop");

let navCollapsed  = false;
let navMobileOpen = false;

export const isMobile = () => window.innerWidth <= 860;

export function initNav() {
  navCollapsed = localStorage.getItem("asl_nav_collapsed") === "1";

  if (isMobile()) {
    sidenav.classList.add("mobile-hidden");
    document.body.classList.remove("nav-open");
  } else {
    if (navCollapsed) {
      sidenav.classList.add("collapsed");
      mainContent.classList.add("nav-collapsed");
    } else {
      document.body.classList.add("nav-open");
    }
  }

  navBackdrop.addEventListener("click", closeMobileNav);

  window.addEventListener("resize", () => {
    if (!isMobile()) {
      navBackdrop.classList.remove("visible");
      sidenav.classList.remove("mobile-hidden");
      navMobileOpen = false;
    } else {
      if (!navMobileOpen) sidenav.classList.add("mobile-hidden");
      sidenav.classList.remove("collapsed");
      mainContent.classList.remove("nav-collapsed");
    }
  });
}

export function toggleNav() {
  if (isMobile()) {
    navMobileOpen = !navMobileOpen;
    if (navMobileOpen) {
      sidenav.classList.remove("mobile-hidden");
      navBackdrop.classList.add("visible");
    } else {
      closeMobileNav();
    }
  } else {
    navCollapsed = !navCollapsed;
    sidenav.classList.toggle("collapsed", navCollapsed);
    mainContent.classList.toggle("nav-collapsed", navCollapsed);
    document.body.classList.toggle("nav-open", !navCollapsed);
    localStorage.setItem("asl_nav_collapsed", navCollapsed ? "1" : "0");
  }
}

export function closeMobileNav() {
  navMobileOpen = false;
  navBackdrop.classList.remove("visible");
  setTimeout(() => { if (!navMobileOpen) sidenav.classList.add("mobile-hidden"); }, 30);
}

export function goPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item[id^='nav-']").forEach(n => n.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  const navEl = document.getElementById("nav-" + page);
  if (navEl) navEl.classList.add("active");
  if (isMobile()) closeMobileNav();
}

window.toggleNav = toggleNav;
window.goPage    = goPage;
