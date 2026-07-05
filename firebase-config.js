// ============================================================
// Tomia Web — Firebase Configuration
// Shared by the public site and the admin dashboard.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
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
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5u8AzAuCOcDaa1M3BtjGkZjvKglzk6lg",
  authDomain: "tomia-web.firebaseapp.com",
  projectId: "tomia-web",
  storageBucket: "tomia-web.firebasestorage.app",
  messagingSenderId: "779350872806",
  appId: "1:779350872806:web:c1953f082aec8e8ec8e127",
  measurementId: "G-ZZN4HL15KF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {
  app,
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
