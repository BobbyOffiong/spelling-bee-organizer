// lib/firebaseConfig.js
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDgiAQ6PSlmmSR0EZqkj-KDeq_uLkxn-kg",
  authDomain: "b-s-spelling-bee-organizer.firebaseapp.com",
  projectId: "b-s-spelling-bee-organizer",
  storageBucket: "b-s-spelling-bee-organizer.firebasestorage.app",
  messagingSenderId: "655335987511",
  appId: "1:655335987511:web:e2b31053913e32db3562b2",
  measurementId: "G-04N1G5Z9E9"
};

// Initialize Firebase App
const app: FirebaseApp = initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

// Conditionally initialize Firebase Analytics only in the browser
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { db, auth, app, analytics };