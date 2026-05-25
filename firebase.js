// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAI5UvsbgrJ1MkJbBvfNsR8twZ4mYN7MtU",
  authDomain: "asl-webapp-a2502.firebaseapp.com",
  projectId: "asl-webapp-a2502",
  storageBucket: "asl-webapp-a2502.firebasestorage.app",
  messagingSenderId: "912803268357",
  appId: "1:912803268357:web:cb3e0b51b16d452501d96c"
};

// Init
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Register
export async function registerUser(email, password) {
  const userCredential =
    await createUserWithEmailAndPassword(auth, email, password);

  const user = userCredential.user;

  // create firestore profile
  await setDoc(doc(db, "users", user.uid), {
    email,
    role: "user",
    createdAt: Date.now()
  });

  return user;
}

// Login
export async function loginUser(email, password) {
  const userCredential =
    await signInWithEmailAndPassword(auth, email, password);

  return userCredential.user;
}

// Logout
export async function logoutUser() {
  await signOut(auth);
}

// Current auth state
export function observeAuth(callback) {
  onAuthStateChanged(auth, callback);
}

// Get role
export async function getUserRole(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data().role;
}