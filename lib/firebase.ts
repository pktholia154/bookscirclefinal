import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, User } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk",
  authDomain: "bookscircle-d579d.firebaseapp.com",
  projectId: "bookscircle-d579d",
  storageBucket: "bookscircle-d579d.firebasestorage.app",
  messagingSenderId: "321886714441",
  appId: "1:321886714441:web:3bde6fb916b24a509cdd98"
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Helper to ensure authenticated state for Firestore rules requiring request.auth != null
export async function ensureFirebaseAuth(): Promise<User | null> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.warn('Anonymous auth not enabled or failed:', err);
    return null;
  }
}

// Initialize Firestore (Attempting with database ID 'bookscircle', fallback to default)
let firestoreDb: Firestore;
try {
  firestoreDb = getFirestore(app, 'bookscircle');
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const defaultDb = getFirestore(app);

