/* ═══════════════════════════════════════
   clips.js — Static video clips (hardcoded by developer)
   To add/remove clips: edit the CLIPS array below and redeploy.
   ═══════════════════════════════════════ */

import { t } from "./i18n.js";

/* ──────────────────────────────────────────────────────────────
   🎬 CLIPS — Add, remove, or edit entries here
   Each entry has:
     name     : Display name shown on the card
     url      : YouTube URL (or any video URL)
     type     : "youtube" | "url"
   ────────────────────────────────────────────────────────────── */
const CLIPS = [
  // ═══════════════════════════════════════════════════════════
  //  🎬 You may edit name freely | Do not break type or url
  // ═══════════════════════════════════════════════════════════
  {
    section: "ASL Lessons",
    name: "A - Z",
    url:  "https://www.youtube.com/watch?v=LC-h5GdhT2k",
    type: "youtube",
  },
  {
    name: "Basic Sentence",
    url:  "https://www.youtube.com/watch?v=S_wnWXeIzAg",
    type: "youtube",
  },
  // ── Add new clips below ───────────────────────────────────
  // {
  //   section: "New section",   ← only set on first clip of each group
  //   name: "Clip title",
  //   url:  "https://www.youtube.com/watch?v=XXXX",
  //   type: "youtube",
  // },
];

/* ══════════════════════════════════════════════════════════════
   No need to edit below this line.
   ══════════════════════════════════════════════════════════════ */

export let clips = [];

/* Build clip objects from the CLIPS array */
function buildClips() {
  clips = CLIPS.map((item, i) => {
    const ytId     = extractYouTubeId(item.url);
    const embedUrl = buildEmbedUrl(item.url, ytId);
    return {
      id:       `static_${i}`,
      name:     item.name,
      section:  item.section || null,   // section label (first clip of each group)
      type:     item.type || (ytId ? "youtube" : "url"),
      url:      item.url,
      embedUrl,
      ytId,
    };
  });
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v"))
      return u.searchParams.get("v");
    if (u.hostname === "youtu.be")
      return u.pathname.slice(1).split("?")[0];
    if (u.pathname.startsWith("/embed/"))
      return u.pathname.split("/embed/")[1].split("?")[0];
    if (u.pathname.startsWith("/shorts/"))
      return u.pathname.split("/shorts/")[1].split("?")[0];
  } catch (_) {}
  return null;
}

function buildEmbedUrl(url, ytId) {
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
  return url;
}

/* ─── Render ─── */
export function renderClips() {
  const lang       = window.__lang__ || "th";
  const grid       = document.getElementById("clipsGrid");
  const countBadge = document.getElementById("clipCountBadge");

  if (!grid) return;

  if (countBadge) countBadge.textContent = clips.length;

  grid.innerHTML = "";

  if (!clips.length) {
    grid.innerHTML = `<div class="empty-clips" style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--text-3);">
      <div style="font-size:56px;margin-bottom:16px;opacity:0.7;">🎬</div>
      <h3 style="color:var(--text-2);font-size:17px;font-weight:600;margin-bottom:8px;">${t(lang, "clipsEmpty")}</h3>
    </div>`;
    return;
  }

  clips.forEach(clip => {
    // Insert section label before card if present
    if (clip.section) {
      const label = document.createElement("div");
      label.className = "clips-section-label";
      label.textContent = clip.section;
      grid.appendChild(label);
    }

    const card = document.createElement("div");
    card.className = "clip-card";
    card.id = "clip-" + clip.id;

    const isYT = clip.type === "youtube";

    const thumbContent = isYT
      ? `<div class="clip-thumb-yt" onclick="openVideoModal('${clip.id}')">
           <img src="https://img.youtube.com/vi/${clip.ytId}/mqdefault.jpg"
                alt="${escHtml(clip.name)}" loading="lazy" />
           <div class="clip-play-btn">▶️</div>
         </div>`
      : `<div class="clip-thumb-url" onclick="openVideoModal('${clip.id}')">
           <div class="clip-play-btn">🔗▶</div>
           <div class="clip-url-label">URL Video</div>
         </div>`;

    card.innerHTML = `
      ${thumbContent}
      <div class="clip-info">
        <div class="clip-title" title="${escHtml(clip.name)}">${escHtml(clip.name)}</div>
        <div class="clip-meta">${isYT ? "▶ YouTube" : "🔗 URL"}</div>
        <div class="clip-actions">
          <button class="btn-dark" onclick="openVideoModal('${clip.id}')">${t(lang, "btnWatchClip")}</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

function escHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])
  );
}

/* ─── Video Modal ─── */
const videoModal  = document.getElementById("videoModal");
const modalVideo  = document.getElementById("modalVideo");
const modalIframe = document.getElementById("modalIframe");
const modalTitle  = document.getElementById("modalVideoTitle");

export function openVideoModal(id) {
  const clip = clips.find(c => c.id === id);
  if (!clip) return;

  if (modalTitle) modalTitle.textContent = clip.name;

  const isEmbed = clip.type === "youtube" || clip.type === "url";

  if (isEmbed && modalIframe && modalVideo) {
    modalVideo.style.display  = "none";
    modalIframe.style.display = "block";
    modalIframe.src = clip.embedUrl || clip.url;
  } else if (modalVideo) {
    if (modalIframe) { modalIframe.style.display = "none"; modalIframe.src = ""; }
    modalVideo.style.display = "block";
    modalVideo.src   = clip.url;
    modalVideo.muted = false;
    modalVideo.play().catch(() => {});
  }

  if (videoModal) videoModal.classList.add("open");
}

export function closeVideoModal() {
  if (modalVideo)  { modalVideo.pause(); modalVideo.src = ""; }
  if (modalIframe) { modalIframe.src = ""; modalIframe.style.display = "none"; }
  if (modalVideo)  modalVideo.style.display = "block";
  if (videoModal)  videoModal.classList.remove("open");
}

export function modalVideoTogglePlay() {
  if (!modalVideo || modalVideo.style.display === "none") return;
  if (modalVideo.paused) modalVideo.play();
  else modalVideo.pause();
}

export function modalVideoFullscreen() {
  const target = (modalIframe && modalIframe.style.display !== "none") ? modalIframe : modalVideo;
  if (!target) return;
  if (target.requestFullscreen)            target.requestFullscreen();
  else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
}

/* ─── Init ─── */
export function initClips() {
  buildClips();
  renderClips();
}

if (videoModal) {
  videoModal.addEventListener("click", e => { if (e.target === videoModal) closeVideoModal(); });
}
document.addEventListener("keydown", e => { if (e.key === "Escape") closeVideoModal(); });

window.openVideoModal       = openVideoModal;
window.closeVideoModal      = closeVideoModal;
window.modalVideoTogglePlay = modalVideoTogglePlay;
window.modalVideoFullscreen = modalVideoFullscreen;
