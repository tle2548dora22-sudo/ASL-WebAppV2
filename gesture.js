/* ═══════════════════════════════════════
   gesture.js — Dynamic Gesture: Sliding Window + Early Prediction
   For gestures like HELLO, THANK_YOU, EAT, DRINK
   English-only UI strings
   ═══════════════════════════════════════ */

import {
  DYNAMIC_API_URL,
  SEQUENCE_LENGTH,
  EARLY_CONFIDENCE,
  DYNAMIC_MIN_CONFIDENCE,
  DYNAMIC_COOLDOWN_MS,
  DYNAMIC_SEND_INTERVAL_MS,
  DYNAMIC_API_TIMEOUT_MS,
  USE_MIRROR_LANDMARKS,
} from "./config.js";

let frameBuffer    = [];
let lastSentTime   = 0;
let cooldownActive = false;
let isRequesting   = false;
let isEnabled      = false;

let onPrediction = null;
let onStatus     = null;

const gestureResultEl = document.getElementById("gestureResult");
const gestureBadgeEl  = document.getElementById("gestureBadge");

function setGestureDisplay(word = "-", confidence = null) {
  if (gestureResultEl) gestureResultEl.textContent = word || "-";
  if (gestureBadgeEl) {
    gestureBadgeEl.textContent = confidence == null ? "" : `${(confidence * 100).toFixed(1)}%`;
  }
}

function setGestureStatus(message) {
  if (typeof onStatus === "function") onStatus(message);
}

export function setOnPrediction(fn) { onPrediction = fn; }
export function setOnStatus(fn)     { onStatus = fn; }

export function enableGesture() {
  isEnabled      = true;
  frameBuffer    = [];
  lastSentTime   = 0;
  cooldownActive = false;
  isRequesting   = false;
  setGestureDisplay("-", null);
}

export function disableGesture() {
  isEnabled = false;
  clearFrameBuffer();
}

export function isGestureEnabled() { return isEnabled; }

export function normalizeLandmarks(rawLandmarks) {
  if (!Array.isArray(rawLandmarks) || rawLandmarks.length < 21) return [];
  const lms = USE_MIRROR_LANDMARKS
    ? rawLandmarks.map(lm => ({ x: 1 - lm.x, y: lm.y, z: lm.z }))
    : rawLandmarks;

  const wrist = lms[0];
  const arr   = [];
  for (const lm of lms) arr.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
  return arr;
}

export function pushFrame(frame63) {
  if (!isEnabled || cooldownActive || isRequesting) return;
  if (!Array.isArray(frame63) || frame63.length !== 63) return;

  frameBuffer.push([...frame63]);
  if (frameBuffer.length > SEQUENCE_LENGTH) frameBuffer.shift();

  const now = Date.now();
  if (now - lastSentTime < DYNAMIC_SEND_INTERVAL_MS) return;
  if (frameBuffer.length < SEQUENCE_LENGTH) return;

  lastSentTime = now;
  sendSequence(frameBuffer.slice(-SEQUENCE_LENGTH));
}

export function clearFrameBuffer() {
  frameBuffer = [];
  setGestureDisplay("-", null);
}

export function resetBuffer() { clearFrameBuffer(); }

export function getBufferProgress() {
  return { current: frameBuffer.length, total: SEQUENCE_LENGTH };
}

async function sendSequence(sequence) {
  if (isRequesting || cooldownActive) return;
  isRequesting = true;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DYNAMIC_API_TIMEOUT_MS);

    const res = await fetch(DYNAMIC_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequence }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch (_) { throw new Error("Invalid JSON: " + raw.slice(0, 120)); }

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error || res.statusText}`);

    handleResponse(data);
  } catch (err) {
    if (err.name === "AbortError") {
      setGestureStatus("[Gesture] API timeout");
    } else {
      setGestureStatus(`[Gesture] API error: ${err.message}`);
      console.warn("[gesture.js]", err);
    }
  } finally {
    isRequesting = false;
  }
}

function handleResponse(data) {
  const rawWord = String(
    data.prediction ?? data.gesture ?? data.label ?? data.class ?? data.word ?? "-"
  ).trim();

  const word = normalizeWord(rawWord);
  let confidence = Number(data.confidence ?? data.score ?? data.probability ?? 0);
  if (confidence > 1) confidence /= 100;
  confidence = Math.min(1, Math.max(0, confidence));

  setGestureDisplay(word, confidence);

  if (!word || word === "-" || word.toUpperCase() === "NONE") return;

  if (confidence >= EARLY_CONFIDENCE) {
    acceptGesture(word, confidence, "early");
    return;
  }

  if (confidence >= DYNAMIC_MIN_CONFIDENCE) {
    acceptGesture(word, confidence, "normal");
    return;
  }

  setGestureStatus(`[Gesture] Confidence too low (${(confidence * 100).toFixed(1)}%)`);
}

function acceptGesture(word, confidence, mode) {
  if (cooldownActive) return;

  if (typeof onPrediction === "function") {
    onPrediction({ prediction: word, confidence });
  }

  const modeText = mode === "early" ? "⚡ Early" : "✓ Confirmed";
  setGestureStatus(`[Gesture ${modeText}] ${word} (${(confidence * 100).toFixed(1)}%)`);

  frameBuffer    = [];
  cooldownActive = true;
  setTimeout(() => { cooldownActive = false; }, DYNAMIC_COOLDOWN_MS);
}

function normalizeWord(word) {
  const map = {
    HELLO:    "Hello",
    THANK_YOU:"Thank you",
    THANKYOU: "Thank you",
    GOODBYE:  "Goodbye",
    SORRY:    "Sorry",
    YES:      "Yes",
    NO:       "No",
    OK:       "OK",
    EAT:      "Eat",
    DRINK:    "Drink",
    SLEEPY:   "Sleepy",
  };
  const key = word.replace(/\s+/g, "_").toUpperCase();
  return map[key] || word.replace(/_/g, " ");
}
