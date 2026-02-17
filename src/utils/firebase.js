import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, update, push, remove } from 'firebase/database';

// Firebase configuration
// TODO: Replace with your actual Firebase config

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
// Check if Firebase is configured
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

if (!isConfigured) {
  console.error('⚠️ Firebase not configured!');
  console.error('Please update src/utils/firebase.js with your Firebase config.');
  console.error('See SETUP.md for instructions.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = isConfigured ? getDatabase(app) : null;

export { database, ref, set, get, onValue, update, push, remove, isConfigured };
