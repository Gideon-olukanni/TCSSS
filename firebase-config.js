// ============================================================
// TOMIA ADMIN — Firebase Configuration
// Modular SDK (v10), matching the same pattern already proven
// to work in Gideon's other project.
// ============================================================

// 1. Core Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. Your unique web credentials — paste your real values here.
// See FIREBASE_SETUP.md, Step 5, for exactly where to get these.
const firebaseConfig = {
  apiKey: "AIzaSyA-46PKat5Z17JUIM94ttRRjryU9kr9qOU",
  authDomain: "tomia-css-website.firebaseapp.com",
  projectId: "tomia-css-website",
  messagingSenderId: "382886279978",
  appId: "1:382886279978:web:eb292fba262c03deb23c53"
};
// 3. Initialize once.
// experimentalAutoDetectLongPolling: some mobile carriers and networks block
// Firestore's default streaming connection, which surfaces as a confusing
// "client is offline" error even though everything else is set up correctly.
// This setting detects that case and automatically switches to a more
// compatible connection method instead.
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
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
