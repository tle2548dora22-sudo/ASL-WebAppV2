/* ═══════════════════════════════════════
   db.js — IndexedDB persistent video storage
   ═══════════════════════════════════════ */

const DB_NAME    = "asl_clips_db";
const DB_VERSION = 1;
const STORE_NAME = "clips";

export let db = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export function dbPutClip(dbInstance, clip) {
  const tx    = dbInstance.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(clip);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export function dbDeleteClip(dbInstance, id) {
  const tx    = dbInstance.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export function dbGetAllClips(dbInstance) {
  return new Promise((resolve, reject) => {
    const tx    = dbInstance.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
}
