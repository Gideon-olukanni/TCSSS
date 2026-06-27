// ============================================================
// TOMIA COMMUNITY SSS — Firebase config (modular SDK, ES modules)
//
// Same project as before (tomia-css-website) — only the SDK style
// changed, from the older "compat" build to this modular one, to
// match the pattern already proven to work reliably on this phone
// and network in the other admin panel.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-46PKat5Z17JUIM94ttRRjryU9kr9qOU",
  authDomain: "tomia-css-website.firebaseapp.com",
  projectId: "tomia-css-website",
  storageBucket: "tomia-css-website.firebasestorage.app",
  messagingSenderId: "382886279978",
  appId: "1:382886279978:web:eb292fba262c03deb23c53",
  measurementId: "G-40SPNG5KKG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
