// ============================================================
// TOMIA ADMIN — Firebase Configuration
// Modular SDK (v10), matching the same pattern already proven
// to work in Gideon's other project.
// ============================================================

// 1. Core Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  initializeFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// 2. Your unique web credentials.
const firebaseConfig = {
  apiKey: "AIzaSyA-46PKat5Z17JUIM94ttRRjryU9kr9qOU",
  authDomain: "tomia-css-website.firebaseapp.com",
  projectId: "tomia-css-website",
  messagingSenderId: "382886279978",
  appId: "1:382886279978:web:eb292fba262c03deb23c53"
};

// 3. Initialize once.
// experimentalForceLongPolling + useFetchStreams:false: some mobile
// browsers and carriers quietly proxy or compress traffic in a way that
// breaks Firestore's default streaming connection — this surfaces as a
// confusing "client is offline" error even though everything else (the
// config, the database, the rules) is completely correct. Forcing long
// polling skips the streaming connection entirely in favor of plain
// HTTP requests, which routes around that kind of interference.
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});
const auth = getAuth(app);

// 4. Export everything the rest of the site needs
export {
  db,
  auth,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
};
