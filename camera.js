/* ═══════════════════════════════════════
   camera.js — Camera + MediaPipe + API prediction
   Supports Static (A–Z) and Dynamic gesture
   English-only UI strings
   ═══════════════════════════════════════ */

import {
  API_URL, USE_MIRROR_LANDMARKS,
  REQUIRED_SAME_COUNT, MIN_CONFIDENCE,
  SEND_INTERVAL_MS, ACCEPT_COOLDOWN_MS, API_TIMEOUT_MS,
} from "./config.js";
import { t } from "./i18n.js";
import { setStatus, addLetterToSentence } from "./sentence.js";
import {
  pushFrame,
  clearFrameBuffer,
  enableGesture,
  disableGesture,
} from "./gesture.js";

const video             = document.getElementById("video");
const outputCanvas      = document.getElementById("outputCanvas");
const outputCtx         = outputCanvas.getContext("2d");
const currentLetterEl   = document.getElementById("currentLetter");
const confidenceEl      = document.getElementById("confidenceText");
const cameraStatusEl    = document.getElementById("cameraStatus");
const systemBadgeEl     = document.getElementById("systemBadge");
const startBtn          = document.getElementById("startBtn");
const overlayEl         = document.getElementById("permissionOverlay");
const skeletonHint      = document.getElementById("skeletonHint");
const confidenceBarWrap = document.getElementById("confidenceBarWrap");
const confidenceBarFill = document.getElementById("confidenceBarFill");

let cameraObj       = null;
let handsObj        = null;
export let isCameraRunning = false;

let lastSentTime    = 0;
let lastSeenLetter  = "";
let sameLetterCount = 0;
let acceptCooldown  = false;

let detectionMode = localStorage.getItem("asl_detection_mode") || "both";

let _mediaPipeLoadPromise = null;

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      if (existing.dataset.loaded === "1") resolve();
      return;
    }
    const script     = document.createElement("script");
    script.src       = src;
    script.crossOrigin = "anonymous";
    script.async     = true;
    script.dataset.mediapipeLazy = "1";
    script.onload    = () => { script.dataset.loaded = "1"; resolve(); };
    script.onerror   = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureMediaPipeLoaded() {
  if (typeof Hands !== "undefined" && typeof Camera !== "undefined" &&
      typeof drawConnectors !== "undefined" && typeof drawLandmarks !== "undefined") {
    return;
  }
  if (!_mediaPipeLoadPromise) {
    _mediaPipeLoadPromise = (async () => {
      await loadExternalScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
      await loadExternalScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadExternalScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
    })();
  }
  return _mediaPipeLoadPromise;
}

const lang = "en";

function setBadge(key) {
  if (systemBadgeEl) {
    systemBadgeEl.textContent    = t(lang, key);
    systemBadgeEl.dataset.i18nKey = key;
  }
}
function setCamStatus(key) {
  if (cameraStatusEl) cameraStatusEl.textContent = t(lang, key);
}

function updateConfidenceBar(confidence) {
  if (!confidenceBarWrap || !confidenceBarFill) return;
  if (confidence == null || confidence <= 0) {
    confidenceBarWrap.style.display = "none";
    return;
  }
  confidenceBarWrap.style.display = "block";
  const pct = Math.round(confidence * 100);
  confidenceBarFill.style.width = `${pct}%`;

  let color, level;
  if (confidence > 0.75)      { color = "var(--green)";  level = "high"; }
  else if (confidence > 0.5)  { color = "var(--yellow)"; level = "medium"; }
  else                        { color = "var(--red)";    level = "low"; }
  confidenceBarFill.style.background = color;

  const labelEl = document.getElementById("confidenceBarLabel");
  if (labelEl) {
    const levelText = { high: "HIGH ✓", medium: "MEDIUM", low: "LOW ✗" };
    labelEl.textContent = `${levelText[level]} — ${pct}%`;
    labelEl.className   = `confidence-bar-label level-${level}`;
  }
}

export function setDetectionMode(mode) {
  detectionMode = ["static", "dynamic", "both"].includes(mode) ? mode : "both";
  localStorage.setItem("asl_detection_mode", detectionMode);

  if (detectionMode === "dynamic" || detectionMode === "both") enableGesture();
  else disableGesture();

  lastSeenLetter  = "";
  sameLetterCount = 0;
  acceptCooldown  = false;

  const modeKey = { static: "modeStatusStatic", dynamic: "modeStatusDynamic", both: "modeStatusBoth" }[detectionMode];
  setStatus(t(lang, modeKey));
}

export function getDetectionMode() { return detectionMode; }

export async function startCameraFromOverlay() {
  const ok = await startCamera();
  if (ok && overlayEl) overlayEl.style.display = "none";
}

export async function startCamera() {
  if (isCameraRunning) {
    setStatus(t(lang, "cameraStarted"));
    return true;
  }

  setStatus(t(lang, "loading"));
  if (startBtn) startBtn.disabled = true;

  if (typeof window.showCameraSkeleton === "function") window.showCameraSkeleton();

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera not supported. Please use HTTPS and a modern browser.");
      return false;
    }
    await ensureMediaPipeLoaded();

    if (typeof Hands === "undefined" || typeof Camera === "undefined") {
      setStatus("MediaPipe not loaded — check your internet connection.");
      return false;
    }

    await destroyMediaPipe();

    handsObj = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    handsObj.setOptions({
      maxNumHands:            1,
      modelComplexity:        1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence:  0.6,
    });
    handsObj.onResults(onHandResults);

    cameraObj = new Camera(video, {
      onFrame: async () => {
        if (handsObj && isCameraRunning) await handsObj.send({ image: video });
      },
      width: 640, height: 480,
    });

    await cameraObj.start();

    isCameraRunning = true;
    lastSentTime    = 0;
    sameLetterCount = 0;
    lastSeenLetter  = "";
    acceptCooldown  = false;

    if (detectionMode === "dynamic" || detectionMode === "both") enableGesture();

    if (typeof window.hideCameraSkeleton === "function") window.hideCameraSkeleton(true);

    setCamStatus("live");
    setBadge("running");
    setStatus(t(lang, "cameraStarted"));
    return true;

  } catch (err) {
    if (typeof window.hideCameraSkeleton === "function") window.hideCameraSkeleton(false);
    setCamStatus("blocked");
    setBadge("stopped");
    const errMap = {
      NotAllowedError:  "denied",
      NotFoundError:    "notFound",
      NotReadableError: "notReadable",
    };
    setStatus(t(lang, errMap[err.name] || "apiFailed") || err.message);
    return false;
  } finally {
    if (startBtn) startBtn.disabled = false;
  }
}

export async function destroyMediaPipe() {
  isCameraRunning = false;
  disableGesture();

  if (cameraObj) {
    try { cameraObj.stop(); } catch (_) {}
    cameraObj = null;
  }
  if (handsObj) {
    try { await handsObj.close(); } catch (_) {}
    handsObj = null;
  }

  await new Promise(r => setTimeout(r, 80));
}

export async function stopCamera() {
  await destroyMediaPipe();

  lastSentTime    = 0;
  sameLetterCount = 0;
  lastSeenLetter  = "";
  acceptCooldown  = false;

  if (typeof window.hideCameraSkeleton === "function") window.hideCameraSkeleton(false);

  if (currentLetterEl) currentLetterEl.textContent = "-";
  if (confidenceEl)    confidenceEl.textContent    = "Confidence: -";
  updateConfidenceBar(null);
  if (skeletonHint) skeletonHint.classList.remove("hidden");

  setCamStatus("cameraOff");
  setBadge("stopped");
  setStatus(t(lang, "cameraStopped"));
}

function onHandResults(results) {
  if (!isCameraRunning) return;

  outputCanvas.width  = results.image.width;
  outputCanvas.height = results.image.height;

  outputCtx.save();
  outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);

  if (results.multiHandLandmarks?.length > 0) {
    const lms = results.multiHandLandmarks[0];

    drawConnectors(outputCtx, lms, HAND_CONNECTIONS, { color: "#3b82f6", lineWidth: 4 });
    drawLandmarks(outputCtx, lms, { color: "#f59e0b", lineWidth: 2 });

    if (skeletonHint) skeletonHint.classList.add("hidden");

    const normalized = normalizeLandmarks(lms);

    if (detectionMode === "static" || detectionMode === "both") maybeSendToApi(lms);
    if (detectionMode === "dynamic" || detectionMode === "both") pushFrame(normalized);
  } else {
    if (currentLetterEl) currentLetterEl.textContent = "-";
    if (confidenceEl)    confidenceEl.textContent    = "Confidence: -";
    updateConfidenceBar(null);
    setStatus(t(lang, "noHand"));
    sameLetterCount = 0;
    lastSeenLetter  = "";
    clearFrameBuffer();
    if (skeletonHint) skeletonHint.classList.remove("hidden");
  }

  outputCtx.restore();
}

function normalizeLandmarks(raw) {
  const lms = USE_MIRROR_LANDMARKS
    ? raw.map(lm => ({ x: 1 - lm.x, y: lm.y, z: lm.z }))
    : raw;

  const wrist = lms[0];
  const arr   = [];
  for (const lm of lms) arr.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
  return arr;
}

function maybeSendToApi(handLandmarks) {
  const now = Date.now();
  if (now - lastSentTime < SEND_INTERVAL_MS) return;
  lastSentTime = now;
  sendLandmarks(handLandmarks);
}

async function sendLandmarks(handLandmarks) {
  if (!isCameraRunning) return;

  const arr = normalizeLandmarks(handLandmarks);
  if (arr.length !== 63) {
    setStatus("Landmark error: expected 63 values, got " + arr.length);
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landmarks: arr }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!isCameraRunning) return;

    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch (_) { throw new Error("Invalid JSON: " + raw.slice(0, 100)); }

    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const letter = String(
      data.prediction ?? data.letter ?? data.label ?? data.class ?? "-"
    ).trim().toUpperCase();

    let confidence = Number(data.confidence ?? data.score ?? data.probability ?? 0);
    if (confidence > 1) confidence /= 100;
    confidence = Math.min(1, Math.max(0, confidence));

    if (currentLetterEl) {
      const newText = letter || "-";
      if (typeof window.animateLetter === "function") {
        window.animateLetter(currentLetterEl, newText);
      } else {
        currentLetterEl.textContent = newText;
      }
    }
    if (confidenceEl) confidenceEl.textContent = `Confidence: ${(confidence * 100).toFixed(1)}%`;
    updateConfidenceBar(letter && letter !== "-" ? confidence : null);

    if (letter && letter !== "-") {
      if (confidence >= MIN_CONFIDENCE) {
        setStatus(t(lang, "apiSuccess"));
        handlePrediction(letter);
      } else {
        setStatus(`${t(lang, "lowConfidence")} (${(confidence * 100).toFixed(1)}%)`);
        sameLetterCount = 0;
        lastSeenLetter  = "";
      }
    }
  } catch (err) {
    if (!isCameraRunning) return;
    setStatus(err.name === "AbortError" ? "API timeout (8 s)" : t(lang, "apiFailed"));
    console.warn("[camera.js]", err);
  }
}

let noHandFrames = 0;
const NO_HAND_SPACE_THRESHOLD = 12;

function handlePrediction(letter) {
  if (acceptCooldown) return;

  noHandFrames = 0;

  if (letter === lastSeenLetter) {
    sameLetterCount++;
  } else {
    lastSeenLetter  = letter;
    sameLetterCount = 1;
  }

  if (sameLetterCount >= REQUIRED_SAME_COUNT) {
    addLetterToSentence(letter);
    sameLetterCount = 0;
    lastSeenLetter  = "";
    acceptCooldown  = true;
    setTimeout(() => { acceptCooldown = false; }, ACCEPT_COOLDOWN_MS);
  }
}

export function handleNoHand() {
  noHandFrames++;
  if (noHandFrames === NO_HAND_SPACE_THRESHOLD) {
    import("./sentence.js").then(m => m.addSpace()).catch(() => {});
    noHandFrames = 0;
  }
}

window.startCameraFromOverlay = startCameraFromOverlay;
window.startCamera            = startCamera;
window.stopCamera             = stopCamera;
window.setDetectionMode       = setDetectionMode;
window.getDetectionMode       = getDetectionMode;
