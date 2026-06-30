// ============================================================
// TOMIA ADMIN — Firebase Configuration
// Modular SDK (v10), matching the same pattern already proven
// to work in Gideon's other project.
// ============================================================

// 1. Core Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, // Replaced initializeFirestore with getFirestore
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

// 2. Your unique web credentials.
const firebaseConfig = {
  apiKey: "AIzaSyA-46PKat5Z17JUIM94ttRRjryU9kr9qOU",
  authDomain: "tomia-css-website.firebaseapp.com",
  projectId: "tomia-css-website",
  messagingSenderId: "382886279978",
  appId: "1:382886279978:web:eb292fba262c03deb23c53"
};

// 3. Initialize once.
const app = initializeApp(firebaseConfig);

// The standard, reliable initialization method in v10
const db = getFirestore(app); 
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
