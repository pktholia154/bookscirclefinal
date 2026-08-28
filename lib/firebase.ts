import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Google Sign-In
export async function signInWithGoogle(): Promise<{ user: User | null; fallbackNeeded?: boolean; cancelled?: boolean; error?: any }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      console.warn('Firebase Auth: domain is not yet in Firebase Console authorized domains list.');
      return { user: null, fallbackNeeded: true, error };
    }
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request')
    ) {
      // User simply closed the popup before completing login
      return { user: null, cancelled: true };
    }
    console.warn('Google Sign-In note:', error?.message || error);
    throw error;
  }
}

// Email & Password Sign-In (Supports Razorpay Verification & standard credentials)
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (cred.user) {
      import('./services/users').then(({ syncUserProfileToFirestore }) => {
        syncUserProfileToFirestore({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          providerId: 'password',
        }).catch((err) => console.warn('User profile sync on email sign in note:', err));
      });
    }
    return cred.user;
  } catch (error: any) {
    // If account doesn't exist yet, try creating it automatically for seamless test login
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential') {
      try {
        const newCred = await createUserWithEmailAndPassword(auth, email, password);
        if (newCred.user) {
          import('./services/users').then(({ syncUserProfileToFirestore }) => {
            syncUserProfileToFirestore({
              uid: newCred.user.uid,
              email: newCred.user.email,
              displayName: newCred.user.displayName || email.split('@')[0],
              photoURL: newCred.user.photoURL,
              providerId: 'password',
            }).catch((err) => console.warn('User profile sync on new user note:', err));
          });
        }
        return newCred.user;
      } catch (createErr) {
        throw error;
      }
    }
    throw error;
  }
}

// Email & Password Registration
export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  if (cred.user) {
    import('./services/users').then(({ syncUserProfileToFirestore }) => {
      syncUserProfileToFirestore({
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || cred.user.displayName || email.split('@')[0],
        photoURL: cred.user.photoURL,
        providerId: 'password',
      }).catch((err) => console.warn('User profile sync on signup note:', err));
    });
  }
  return cred.user;
}

// Sign Out
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
}

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

// Initialize Firestore with default database
export const db: Firestore = getFirestore(app);
export const defaultDb: Firestore = db;

