import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk",
  authDomain: "bookscircle-d579d.firebaseapp.com",
  projectId: "bookscircle-d579d",
  storageBucket: "bookscircle-d579d.firebasestorage.app",
  messagingSenderId: "321886714441",
  appId: "1:321886714441:web:3bde6fb916b24a509cdd98"
};

export interface SyncedAuthProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const AUTH_STORAGE_KEY = 'bookscircle_auth_user';
export const AUTH_LEGACY_STORAGE_KEY = 'bookscircle_user_session';
export const AUTH_STATE_CHANGED_EVENT = 'bookscircle:auth-state-changed';
export const AUTH_CACHE_NAME = 'bookscircle-auth-sync-v1';
export const AUTH_CACHE_URL = '/__bookscircle_auth_state__.json';
const AUTH_BROADCAST_CHANNEL = 'bookscircle_auth_channel';

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createFirebaseAuthInstance(): Auth {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth: Auth = createFirebaseAuthInstance();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let memoryAuthProfile: SyncedAuthProfile | null = null;
let activeGoogleSignInPromise: Promise<{
  user: User | null;
  profile: SyncedAuthProfile | null;
  fallbackNeeded?: boolean;
  cancelled?: boolean;
  error?: any;
}> | null = null;
let authSyncInitialized = false;

export function formatUserToProfile(user: User | SyncedAuthProfile): SyncedAuthProfile {
  const email = user.email || null;
  const displayName =
    user.displayName || (email ? email.split('@')[0] : 'Google User');
  return {
    uid: user.uid,
    email,
    displayName,
    photoURL: user.photoURL || null,
  };
}

/**
 * Synchronously reads the cached authenticated user from memory or localStorage
 * for zero-latency, zero-flicker hydration across web and installed PWA views.
 */
export function getCachedAuthUserSync(): SyncedAuthProfile | null {
  if (memoryAuthProfile && memoryAuthProfile.uid) {
    return memoryAuthProfile;
  }
  if (typeof window === 'undefined') return null;

  try {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      const liveProfile = formatUserToProfile(auth.currentUser);
      memoryAuthProfile = liveProfile;
      return liveProfile;
    }
  } catch {}

  try {
    const raw =
      localStorage.getItem(AUTH_STORAGE_KEY) ||
      localStorage.getItem(AUTH_LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.uid) {
        const profile = formatUserToProfile(parsed);
        memoryAuthProfile = profile;
        return profile;
      }
    }
  } catch {}

  return null;
}

/**
 * Persists or clears the user profile across memory, localStorage, CacheStorage (for PWA <-> Web sync),
 * BroadcastChannel, and custom DOM events.
 */
export function persistAndBroadcastAuthUser(
  profile: SyncedAuthProfile | null,
  source: 'local' | 'remote' = 'local'
): void {
  const prev = memoryAuthProfile;
  const isUnchanged =
    (prev === null && profile === null) ||
    (prev !== null &&
      profile !== null &&
      prev.uid === profile.uid &&
      prev.email === profile.email &&
      prev.displayName === profile.displayName &&
      prev.photoURL === profile.photoURL);

  memoryAuthProfile = profile;

  if (typeof window === 'undefined') return;

  try {
    if (profile) {
      const serialized = JSON.stringify(profile);
      localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      localStorage.setItem(AUTH_LEGACY_STORAGE_KEY, serialized);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_LEGACY_STORAGE_KEY);
    }
  } catch {}

  // Write to shared CacheStorage so standalone PWA and Web browser stay in sync
  try {
    if ('caches' in window) {
      caches
        .open(AUTH_CACHE_NAME)
        .then((cache) => {
          if (profile) {
            const response = new Response(
              JSON.stringify({ profile, updatedAt: Date.now() }),
              { headers: { 'Content-Type': 'application/json' } }
            );
            return cache.put(AUTH_CACHE_URL, response);
          } else {
            return cache.delete(AUTH_CACHE_URL);
          }
        })
        .catch(() => {});
    }
  } catch {}

  if (!isUnchanged) {
    try {
      window.dispatchEvent(
        new CustomEvent(AUTH_STATE_CHANGED_EVENT, { detail: { user: profile } })
      );
    } catch {}

    if (source === 'local' && typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
        bc.postMessage({ type: 'AUTH_UPDATE', profile, timestamp: Date.now() });
        bc.close();
      } catch {}
    }
  }
}

/**
 * Restores auth state from shared CacheStorage or URL handoff if localStorage was empty
 * (e.g. when launching the installed PWA from the browser for the first time).
 */
async function hydrateAuthFromSharedCacheOrUrl(): Promise<SyncedAuthProfile | null> {
  if (typeof window === 'undefined') return null;

  // 1. Check URL handoff parameter (`_auth` base64 JSON) when launching installed PWA
  try {
    const url = new URL(window.location.href);
    const authParam = url.searchParams.get('_auth');
    if (authParam) {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(authParam))));
      if (decoded && decoded.uid) {
        const profile = formatUserToProfile(decoded);
        persistAndBroadcastAuthUser(profile, 'remote');
      }
      url.searchParams.delete('_auth');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch {}

  // 2. Check shared CacheStorage
  try {
    if ('caches' in window) {
      const cache = await caches.open(AUTH_CACHE_NAME);
      const res = await cache.match(AUTH_CACHE_URL);
      if (res && res.ok) {
        const data = await res.json();
        if (data?.profile?.uid) {
          const cachedProfile = formatUserToProfile(data.profile);
          if (!memoryAuthProfile) {
            persistAndBroadcastAuthUser(cachedProfile, 'remote');
          }
          return cachedProfile;
        }
      }
    }
  } catch {}

  return memoryAuthProfile;
}

/**
 * Background cloud sync helper for user profile & purchases upon login or session restore
 */
function triggerBackgroundUserAndPurchasesSync(profile: SyncedAuthProfile): void {
  if (!profile || !profile.uid) return;

  import('./services/users')
    .then(({ syncUserProfileToFirestore }) => {
      syncUserProfileToFirestore({
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        providerId: 'google.com',
      }).catch(() => {});
    })
    .catch(() => {});

  import('./services/purchases')
    .then(({ syncUserPurchases }) => {
      syncUserPurchases(profile.uid, profile.email || undefined).catch(() => {});
    })
    .catch(() => {});
}

/**
 * Initializes global listeners once per window lifecycle to keep Firebase Auth,
 * Redirect results, BroadcastChannel, Storage events, and visibility focus in 100% sync.
 */
function ensureGlobalAuthSyncInitialized(): void {
  if (typeof window === 'undefined' || authSyncInitialized) return;
  authSyncInitialized = true;

  // Hydrate initial state
  getCachedAuthUserSync();
  hydrateAuthFromSharedCacheOrUrl().catch(() => {});

  // Handle redirect result if mobile/standalone browser used signInWithRedirect fallback
  getRedirectResult(auth)
    .then((result) => {
      if (result && result.user && !result.user.isAnonymous) {
        const profile = formatUserToProfile(result.user);
        persistAndBroadcastAuthUser(profile, 'local');
        triggerBackgroundUserAndPurchasesSync(profile);
      }
    })
    .catch(() => {});

  // Primary Firebase Auth state listener
  onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
      const profile = formatUserToProfile(user);
      persistAndBroadcastAuthUser(profile, 'local');
      triggerBackgroundUserAndPurchasesSync(profile);
    } else if (!user) {
      // Only clear if Firebase explicitly reports signed out AND no redirect/cache is pending
      if (!auth.currentUser) {
        hydrateAuthFromSharedCacheOrUrl().then((sharedProfile) => {
          if (!sharedProfile && !auth.currentUser) {
            persistAndBroadcastAuthUser(null, 'remote');
          }
        });
      }
    }
  });

  // Listen to cross-tab / PWA <-> Browser BroadcastChannel messages
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      bc.onmessage = (event) => {
        if (event?.data?.type === 'AUTH_UPDATE') {
          const incoming: SyncedAuthProfile | null = event.data.profile || null;
          persistAndBroadcastAuthUser(incoming, 'remote');
          if (incoming) {
            triggerBackgroundUserAndPurchasesSync(incoming);
          }
        }
      };
    } catch {}
  }

  // Listen to cross-tab localStorage changes
  window.addEventListener('storage', (e) => {
    if (e.key === AUTH_STORAGE_KEY || e.key === AUTH_LEGACY_STORAGE_KEY) {
      if (e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.uid) {
            const profile = formatUserToProfile(parsed);
            persistAndBroadcastAuthUser(profile, 'remote');
          }
        } catch {}
      } else {
        persistAndBroadcastAuthUser(null, 'remote');
      }
    }
  });

  // Re-verify auth & purchases when switching between Web and Installed App (focus / visibilitychange)
  const handleAppWake = () => {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    const localUser = getCachedAuthUserSync();
    if (localUser) {
      persistAndBroadcastAuthUser(localUser, 'remote');
      triggerBackgroundUserAndPurchasesSync(localUser);
    } else {
      hydrateAuthFromSharedCacheOrUrl().then((restored) => {
        if (restored) {
          triggerBackgroundUserAndPurchasesSync(restored);
        }
      });
    }
  };

  window.addEventListener('focus', handleAppWake);
  window.addEventListener('visibilitychange', handleAppWake);
}

/**
 * Subscribe to unified authentication state across any component, page, or PWA window.
 * Immediately invokes callback with cached user if present for instant glitch-free UI.
 */
export function subscribeToUnifiedAuthState(
  callback: (user: SyncedAuthProfile | null) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  ensureGlobalAuthSyncInitialized();

  const initial = getCachedAuthUserSync();
  if (initial) {
    callback(initial);
  }

  const handleAuthEvent = (e: Event) => {
    const custom = e as CustomEvent<{ user: SyncedAuthProfile | null }>;
    callback(custom.detail?.user ?? getCachedAuthUserSync());
  };

  window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthEvent as EventListener);

  const unsubFirebase = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser && !firebaseUser.isAnonymous) {
      const profile = formatUserToProfile(firebaseUser);
      persistAndBroadcastAuthUser(profile, 'local');
      callback(profile);
    } else {
      const cached = getCachedAuthUserSync();
      callback(cached);
    }
  });

  return () => {
    window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthEvent as EventListener);
    unsubFirebase();
  };
}

/**
 * Smooth, fast, deduplicated Google Sign-In for Web & Installed PWA.
 * Prevents duplicate popup glitches on double-clicks and automatically syncs
 * profile + purchases across all open tabs and standalone app windows.
 */
export async function signInWithGoogle(): Promise<{
  user: User | null;
  profile?: SyncedAuthProfile | null;
  fallbackNeeded?: boolean;
  cancelled?: boolean;
  error?: any;
}> {
  ensureGlobalAuthSyncInitialized();

  // Deduplicate concurrent sign-in requests so rapid taps never cause auth/cancelled-popup-request
  if (activeGoogleSignInPromise) {
    return activeGoogleSignInPromise;
  }

  activeGoogleSignInPromise = (async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const profile = formatUserToProfile(result.user);
        persistAndBroadcastAuthUser(profile, 'local');
        triggerBackgroundUserAndPurchasesSync(profile);
        return { user: result.user, profile };
      }
      return { user: null, profile: null };
    } catch (error: any) {
      // Automatic fallback to signInWithRedirect if popup is blocked by standalone PWA / mobile browser
      if (error?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return { user: null, profile: null, cancelled: true };
        } catch {}
      }

      if (
        error?.code === 'auth/unauthorized-domain' ||
        error?.message?.includes('unauthorized-domain')
      ) {
        console.warn('Firebase Auth: domain is not yet in Firebase Console authorized domains list.');
        return { user: null, profile: null, fallbackNeeded: true, error };
      }
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup-closed-by-user') ||
        error?.message?.includes('cancelled-popup-request')
      ) {
        // Check if auth actually succeeded in another popup before closing
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
          const profile = formatUserToProfile(auth.currentUser);
          persistAndBroadcastAuthUser(profile, 'local');
          triggerBackgroundUserAndPurchasesSync(profile);
          return { user: auth.currentUser, profile };
        }
        return { user: null, profile: null, cancelled: true };
      }
      console.warn('Google Sign-In note:', error?.message || String(error));
      throw error;
    } finally {
      activeGoogleSignInPromise = null;
    }
  })();

  return activeGoogleSignInPromise;
}

// Email & Password Sign-In (Supports Razorpay Verification & standard credentials)
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (cred.user) {
      const profile = formatUserToProfile(cred.user);
      persistAndBroadcastAuthUser(profile, 'local');
      triggerBackgroundUserAndPurchasesSync(profile);
    }
    return cred.user;
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential') {
      try {
        const newCred = await createUserWithEmailAndPassword(auth, email, password);
        if (newCred.user) {
          const profile = formatUserToProfile(newCred.user);
          persistAndBroadcastAuthUser(profile, 'local');
          triggerBackgroundUserAndPurchasesSync(profile);
        }
        return newCred.user;
      } catch {
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
    const profile = formatUserToProfile({
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: displayName || cred.user.displayName || email.split('@')[0],
      photoURL: cred.user.photoURL,
    });
    persistAndBroadcastAuthUser(profile, 'local');
    triggerBackgroundUserAndPurchasesSync(profile);
  }
  return cred.user;
}

// Sign Out across Web & Installed PWA
export async function signOutUser(): Promise<void> {
  persistAndBroadcastAuthUser(null, 'local');
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', (error as any)?.message || String(error));
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
    console.warn('Anonymous auth not enabled or failed:', (err as any)?.message || String(err));
    return null;
  }
}

/**
 * Initialize Firestore explicitly connected to the user's 'bookscircle' database.
 * Using experimentalAutoDetectLongPolling ensures the client switches transport immediately
 * if streaming or WebChannel is hindered by network firewalls or reverse proxies, preventing
 * the 10-second timeout disconnect.
 */
function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true,
    }, 'bookscircle');
  } catch {
    try {
      return getFirestore(app, 'bookscircle');
    } catch {
      return getFirestore(app);
    }
  }
}

export const db: Firestore = createFirestoreInstance();
export const defaultDb: Firestore = db;
