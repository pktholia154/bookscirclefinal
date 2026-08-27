import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db, defaultDb } from '../firebase';
import { getPurchasedBookIdsFromLocal } from '../offline-storage';

export interface FirestoreUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId?: string;
  role: 'user' | 'admin' | 'subscriber';
  purchasedBooks: string[];
  purchasesCount: number;
  totalSpent?: number;
  createdAt: string;
  lastLoginAt: string;
  updatedAt: string;
  metadata?: {
    platform?: string;
    userAgent?: string;
    domain?: string;
  };
}

/**
 * Ensures a user document in the 'users' collection exists and is up to date in Firestore.
 * Writes to both the primary 'bookscircle' named database and default database,
 * simultaneously dispatching to the server API and client-side Firestore SDK.
 */
export async function syncUserProfileToFirestore(
  user: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    providerId?: string | null;
  },
  additionalData?: {
    purchasedBookIds?: string[];
    [key: string]: any;
  }
): Promise<FirestoreUserProfile | null> {
  if (!user || !user.uid) return null;

  const now = new Date().toISOString();
  const explicitPurchased = additionalData?.purchasedBookIds || [];

  const fallbackEmail = user.email || '';
  const fallbackDisplayName =
    user.displayName ||
    (fallbackEmail ? fallbackEmail.split('@')[0] : 'Reader');

  const profilePayload: Record<string, any> = {
    uid: user.uid,
    email: user.email || null,
    displayName: fallbackDisplayName,
    photoURL: user.photoURL || null,
    providerId: user.providerId || 'google.com',
    role: 'user',
    createdAt: now,
    lastLoginAt: now,
    updatedAt: now,
    metadata: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      domain: typeof window !== 'undefined' ? window.location.hostname : 'bookscircle.org',
    },
  };

  if (explicitPurchased.length > 0) {
    profilePayload.purchasedBooks = explicitPurchased;
    profilePayload.purchasesCount = explicitPurchased.length;
    profilePayload.totalSpent = additionalData?.totalSpent || 0;
  }

  // 1. Dispatch to server-side Firestore synchronization endpoint (bypasses client firewall / CORS / auth limits)
  try {
    fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profilePayload),
    }).catch((err) => console.warn('Server user sync dispatch note:', err));
  } catch (e) {
    // Non-blocking server dispatch
  }

  // 2. Direct client-side Firestore SDK writes across all database instances
  const instances = [db, defaultDb].filter(Boolean);
  for (const firestoreInstance of instances) {
    if (!firestoreInstance) continue;

    try {
      const userRef = doc(firestoreInstance, 'users', user.uid);
      const updateData: Record<string, any> = {
        uid: user.uid,
        email: user.email || null,
        displayName: fallbackDisplayName,
        photoURL: user.photoURL || null,
        providerId: user.providerId || 'google.com',
        role: 'user',
        lastLoginAt: now,
        updatedAt: now,
      };

      if (explicitPurchased.length > 0) {
        updateData.purchasedBooks = arrayUnion(...explicitPurchased);
        updateData.purchasesCount = increment(explicitPurchased.length);
      }

      await setDoc(userRef, updateData, { merge: true });
    } catch (err) {
      console.warn('Firestore user client write attempt note:', err);
    }
  }

  return profilePayload as unknown as FirestoreUserProfile;
}

/**
 * Fetches user profile from Firestore /users/{uid}
 */
export async function getUserProfileFromFirestore(
  uid: string
): Promise<FirestoreUserProfile | null> {
  if (!uid) return null;

  const instances = [db, defaultDb].filter(Boolean);
  for (const firestoreInstance of instances) {
    if (!firestoreInstance) continue;
    try {
      const userRef = doc(firestoreInstance, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as FirestoreUserProfile;
      }
    } catch (err) {
      console.warn('Error fetching user profile from Firestore:', err);
    }
  }
  return null;
}
