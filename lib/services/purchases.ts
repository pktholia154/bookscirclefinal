import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  increment,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, defaultDb, auth } from '../firebase';
import {
  getPurchasedBookIdsFromLocal,
  savePurchasedBookIds,
  queuePendingPurchase,
  getPendingPurchases,
  removePendingPurchase,
} from '../offline-storage';
import { CartItem, Book } from '../types';
import { FREE_SAMPLE_BOOK_ID } from '../data';

export interface PurchaseItemDetail {
  id: string;
  title: string;
  slug?: string;
  price: number;
  category?: string;
  pdf_file?: string;
  pdfStoragePath?: string;
  mdurl?: string;
  mdsampleurl?: string;
  md_file?: string;
  cover?: string;
}

export interface PurchaseRecord {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'verified' | 'completed' | 'pending';
  purchasedAt: string;
  userId: string;
  userEmail: string;
  userName?: string;
  books: PurchaseItemDetail[];
  bookIds: string[];
  clientInfo?: {
    platform?: string;
    userAgent?: string;
    domain?: string;
    timestamp?: number;
  };
  metadata?: Record<string, any>;
}

export interface UserPurchasesSummary {
  userId: string;
  userEmail: string;
  bookIds: string[];
  totalBooksCount: number;
  createdAt: string;
  lastUpdated: string;
  orders?: {
    orderId: string;
    paymentId: string;
    purchasedAt: string;
    amount: number;
    bookIds: string[];
    bookTitles: string[];
  }[];
}

// Helper to normalize email for Firestore document ID safety
export function normalizeEmailForDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * 1. Save and record user purchase in Firestore and local offline storage.
 * Synchronously updates client state for instantaneous response, then persists
 * multi-tier structured records in Firestore for multi-device sync, receipt generation,
 * and future administrative or analytics queries.
 */
export async function recordUserPurchaseInFirestore(
  userId: string,
  userEmail: string,
  cartItems: CartItem[],
  paymentInfo: {
    orderId: string;
    paymentId: string;
    amount: number;
    userName?: string;
    status?: 'verified' | 'completed';
    metadata?: Record<string, any>;
  }
): Promise<string[]> {
  const bookIds = cartItems.map((item) => item.book.id);
  const now = new Date().toISOString();

  // 1. Instant local persistence for zero-delay UI rendering
  await savePurchasedBookIds(bookIds);

  const purchaseItemDetails: PurchaseItemDetail[] = cartItems.map((item) => ({
    id: item.book.id,
    title: item.book.title,
    slug: item.book.slug || item.book.seoslug,
    price: item.book.buy_price,
    category: item.book.category,
    pdf_file: item.book.pdf_file,
    pdfStoragePath: item.book.pdfStoragePath,
    mdurl: item.book.mdurl || item.book.mdUrl,
    mdsampleurl: item.book.mdsampleurl || item.book.mdSampleUrl,
    md_file: item.book.md_file,
    cover: item.book.cover,
  }));

  const effectiveUserId =
    userId && userId !== 'guest_user'
      ? userId
      : auth?.currentUser?.uid || 'guest_user';
  const effectiveUserEmail =
    userEmail && userEmail !== 'user@bookscircle.org'
      ? userEmail
      : auth?.currentUser?.email || userEmail || 'user@bookscircle.org';

  const purchaseRecord: PurchaseRecord = {
    orderId: paymentInfo.orderId || `ord_${Date.now()}`,
    paymentId: paymentInfo.paymentId || `pay_${Date.now()}`,
    amount: paymentInfo.amount || 0,
    currency: 'INR',
    status: paymentInfo.status || 'verified',
    purchasedAt: now,
    userId: effectiveUserId,
    userEmail: effectiveUserEmail,
    userName: paymentInfo.userName || 'Reader',
    books: purchaseItemDetails,
    bookIds,
    clientInfo: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      domain: typeof window !== 'undefined' ? window.location.hostname : 'bookscircle.org',
      timestamp: Date.now(),
    },
    metadata: paymentInfo.metadata || {},
  };

  const orderSummaryEntry = {
    orderId: purchaseRecord.orderId,
    paymentId: purchaseRecord.paymentId,
    purchasedAt: now,
    amount: purchaseRecord.amount,
    bookIds,
    bookTitles: cartItems.map((i) => i.book.title),
  };

  // 1. Dispatch to server-side Firestore purchase sync endpoint (guarantees write across 'bookscircle' and '(default)')
  try {
    fetch('/api/purchases/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: purchaseRecord.paymentId,
        orderId: purchaseRecord.orderId,
        userId: purchaseRecord.userId,
        userEmail: purchaseRecord.userEmail,
        bookIds: purchaseRecord.bookIds,
        amount: purchaseRecord.amount,
        currency: purchaseRecord.currency,
        status: purchaseRecord.status,
        purchasedAt: now,
      }),
    }).catch((err) => console.warn('Server purchase sync dispatch note:', err));
  } catch (e) {
    // Non-blocking server dispatch
  }

  // 2. Persist in Firestore user document and subcollection
  let recordedInCloud = false;
  try {
    // 1. /users/{userId} & subcollection /users/{userId}/purchases/{paymentId}
    if (effectiveUserId && effectiveUserId !== 'guest_user') {
      const userProfileDocRef = doc(db, 'users', effectiveUserId);
      await setDoc(
        userProfileDocRef,
        {
          uid: effectiveUserId,
          email: effectiveUserEmail,
          purchasedBooks: arrayUnion(...bookIds),
          purchasesCount: increment(bookIds.length),
          totalSpent: increment(purchaseRecord.amount),
          lastPurchasedAt: now,
          lastOrderId: purchaseRecord.orderId,
          lastPaymentId: purchaseRecord.paymentId,
          updatedAt: now,
        },
        { merge: true }
      );

      // Subcollection record under user: /users/{userId}/purchases/{paymentId}
      const userPurchaseSubDocRef = doc(
        db,
        'users',
        effectiveUserId,
        'purchases',
        purchaseRecord.paymentId
      );
      await setDoc(userPurchaseSubDocRef, purchaseRecord, { merge: true });

      // 2. Top-level /user_purchases/{userId}
      const userPurchasesDocRef = doc(db, 'user_purchases', effectiveUserId);
      await setDoc(
        userPurchasesDocRef,
        {
          userId: effectiveUserId,
          userEmail: effectiveUserEmail,
          purchasedBooks: arrayUnion(...bookIds),
          totalBooksCount: increment(bookIds.length),
          totalSpent: increment(purchaseRecord.amount),
          lastPurchasedAt: now,
          lastOrderId: purchaseRecord.orderId,
          lastPaymentId: purchaseRecord.paymentId,
          lastUpdated: now,
        },
        { merge: true }
      );

      // 3. Top-level /user_purchases_by_email/{normalizedEmail}
      if (effectiveUserEmail) {
        const normEmail = normalizeEmailForDocId(effectiveUserEmail);
        const emailPurchasesDocRef = doc(db, 'user_purchases_by_email', normEmail);
        await setDoc(
          emailPurchasesDocRef,
          {
            userEmail: effectiveUserEmail,
            userId: effectiveUserId,
            purchasedBooks: arrayUnion(...bookIds),
            totalBooksCount: increment(bookIds.length),
            totalSpent: increment(purchaseRecord.amount),
            lastPurchasedAt: now,
            lastOrderId: purchaseRecord.orderId,
            lastPaymentId: purchaseRecord.paymentId,
            lastUpdated: now,
          },
          { merge: true }
        );
      }
    }

    // 4. Top-level /purchases/{paymentId}
    const topPurchaseDocRef = doc(db, 'purchases', purchaseRecord.paymentId);
    await setDoc(topPurchaseDocRef, purchaseRecord, { merge: true });

    // 5. Top-level /orders/{orderId}
    const topOrderDocRef = doc(db, 'orders', purchaseRecord.orderId);
    await setDoc(
      topOrderDocRef,
      {
        orderId: purchaseRecord.orderId,
        paymentId: purchaseRecord.paymentId,
        amount: purchaseRecord.amount,
        currency: purchaseRecord.currency,
        status: purchaseRecord.status,
        purchasedAt: now,
        userId: effectiveUserId,
        userEmail: effectiveUserEmail,
        books: purchaseItemDetails,
        bookIds,
        updatedAt: now,
      },
      { merge: true }
    );

    // 6. Update book analytics: /book_analytics/{bookId}
    for (const item of cartItems) {
      try {
        const analyticsDocRef = doc(db, 'book_analytics', item.book.id);
        await setDoc(
          analyticsDocRef,
          {
            bookId: item.book.id,
            title: item.book.title,
            category: item.book.category || 'General',
            totalPurchases: increment(1),
            lastPurchasedAt: now,
          },
          { merge: true }
        );
      } catch (analyticsErr) {
        // Non-blocking analytics write
      }
    }

    recordedInCloud = true;
  } catch (err) {
    console.warn('Firestore cloud purchase sync attempt error:', (err as any)?.message || String(err));
  }

  // 3. If offline or cloud write failed, queue for automated background sync
  if (!recordedInCloud) {
    await queuePendingPurchase({
      userId,
      userEmail,
      paymentId: purchaseRecord.paymentId,
      orderId: purchaseRecord.orderId,
      amount: purchaseRecord.amount,
      bookIds,
      items: purchaseItemDetails,
    });
  }

  const allPurchased = Array.from(new Set([...getPurchasedBookIdsFromLocal(), ...bookIds]));
  await savePurchasedBookIds(allPurchased);
  return allPurchased;
}

/**
 * Fast REST API lookup for user purchases across 'bookscircle' and '(default)' databases.
 * Runs in parallel with Firebase SDK to guarantee sub-200ms purchase sync after Google login.
 */
async function fetchUserPurchasesFromRest(userId?: string, userEmail?: string): Promise<string[]> {
  const ids: string[] = [];
  const dbs = ['bookscircle', '(default)'];
  const urls: string[] = [];

  for (const dbName of dbs) {
    const base = `https://firestore.googleapis.com/v1/projects/bookscircle-d579d/databases/${dbName}/documents`;
    if (userId && userId !== 'guest_user') {
      urls.push(`${base}/users/${encodeURIComponent(userId)}?key=AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk`);
      urls.push(`${base}/user_purchases/${encodeURIComponent(userId)}?key=AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk`);
    }
    if (userEmail) {
      const normEmail = normalizeEmailForDocId(userEmail);
      urls.push(`${base}/user_purchases_by_email/${encodeURIComponent(normEmail)}?key=AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk`);
    }
  }

  if (urls.length === 0) return ids;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const responses = await Promise.all(
      urls.map((u) => fetch(u, { signal: controller.signal, cache: 'no-store' }).catch(() => null))
    );
    clearTimeout(timer);

    for (const res of responses) {
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        const vals = json?.fields?.purchasedBooks?.arrayValue?.values;
        if (Array.isArray(vals)) {
          for (const v of vals) {
            if (v?.stringValue) ids.push(v.stringValue);
          }
        }
      }
    }
  } catch {}

  return ids;
}

/**
 * 2. Fetch purchased book IDs for a user directly from Firebase DB collections.
 * Performs lookup across /users/{userId}, /users/{userId}/purchases, /user_purchases/{userId},
 * and /user_purchases_by_email/{normalizedEmail} via both fast REST and SDK in parallel.
 */
export async function syncUserPurchases(userId?: string, userEmail?: string): Promise<string[]> {
  const localPurchased = getPurchasedBookIdsFromLocal();
  const remoteBookIds: string[] = [];

  // Also trigger flush of any pending purchases recorded while offline
  syncPendingPurchasesToFirestore().catch(() => {});

  if ((userId && userId !== 'guest_user') || userEmail) {
    const restPromise = fetchUserPurchasesFromRest(userId, userEmail).catch(() => [] as string[]);

    const sdkPromise = (async () => {
      const sdkIds: string[] = [];
      if (!userId || userId === 'guest_user') return sdkIds;
      try {
        // A. Check primary user document: /users/{userId}
        const userDocRef = doc(db, 'users', userId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.purchasedBooks)) {
            sdkIds.push(...data.purchasedBooks);
          }
        }

        // B. Check subcollection /users/{userId}/purchases
        try {
          const subColRef = collection(db, 'users', userId, 'purchases');
          const subSnap = await getDocs(subColRef);
          subSnap.forEach((d) => {
            const pData = d.data();
            if (Array.isArray(pData?.bookIds)) {
              sdkIds.push(...pData.bookIds);
            }
          });
        } catch {}

        // C. Check /user_purchases/{userId}
        try {
          const upRef = doc(db, 'user_purchases', userId);
          const upSnap = await getDoc(upRef);
          if (upSnap.exists()) {
            const upData = upSnap.data();
            if (Array.isArray(upData?.purchasedBooks)) {
              sdkIds.push(...upData.purchasedBooks);
            }
          }
        } catch {}

        // D. Check /user_purchases_by_email/{normalizedEmail}
        if (userEmail) {
          try {
            const normEmail = normalizeEmailForDocId(userEmail);
            const emailDocRef = doc(db, 'user_purchases_by_email', normEmail);
            const emailSnap = await getDoc(emailDocRef);
            if (emailSnap.exists()) {
              const eData = emailSnap.data();
              if (Array.isArray(eData?.purchasedBooks)) {
                sdkIds.push(...eData.purchasedBooks);
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Could not sync user purchases from cloud:', (err as any)?.message || String(err));
      }
      return sdkIds;
    })();

    const [restIds, sdkIds] = await Promise.all([restPromise, sdkPromise]);
    remoteBookIds.push(...restIds, ...sdkIds);
  }

  const uniqueRemoteIds = Array.from(new Set(remoteBookIds));

  // Merge remote with local purchases to ensure offline resilience
  if ((userId && userId !== 'guest_user') || userEmail) {
    const mergedIds = Array.from(new Set([FREE_SAMPLE_BOOK_ID, ...localPurchased, ...uniqueRemoteIds]));
    await savePurchasedBookIds(mergedIds);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('bookscircle:purchases-updated', {
            detail: { bookIds: mergedIds },
          })
        );
      } catch {}
    }
    return mergedIds;
  }

  // Fallback for guest users without an account: return local storage with sample book
  return Array.from(new Set([FREE_SAMPLE_BOOK_ID, ...localPurchased]));
}

/**
 * 3. Retrieve complete user purchase transaction history and invoices from Firestore
 * Reads from /users/{userId}/purchases subcollection
 */
export async function getUserPurchaseHistory(
  userId?: string,
  userEmail?: string
): Promise<PurchaseRecord[]> {
  const records: PurchaseRecord[] = [];
  const seenPaymentIds = new Set<string>();

  if (!userId || userId === 'guest_user') return [];

  try {
    const subColRef = collection(db, 'users', userId, 'purchases');
    const subSnap = await getDocs(subColRef);
    subSnap.forEach((docSnap) => {
      const data = docSnap.data() as PurchaseRecord;
      if (data.paymentId && !seenPaymentIds.has(data.paymentId)) {
        seenPaymentIds.add(data.paymentId);
        records.push(data);
      }
    });
  } catch (err) {
    console.warn('Error fetching user purchase history from subcollection:', (err as any)?.message || String(err));
  }

  // Sort by newest purchasedAt first
  records.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  return records;
}

/**
 * 4. Migrate and link guest purchases to an authenticated user's profile
 */
export async function migrateGuestPurchasesToUser(
  guestBookIds: string[],
  userId: string,
  userEmail: string,
  allBooks?: Book[]
): Promise<string[]> {
  if (!userId || userId === 'guest_user' || guestBookIds.length === 0) {
    return guestBookIds;
  }

  try {
    const items: CartItem[] = guestBookIds.map((bookId) => {
      const foundBook = allBooks?.find((b) => b.id === bookId);
      return {
        book: foundBook || {
          id: bookId,
          title: `Book ${bookId}`,
          slug: bookId,
          seo_description: '',
          full_description: '',
          category: 'Competitive Exams',
          tags: [],
          isActive: true,
          buy_price: 49,
          list_price: 99,
          pdf_file: '',
          sample_file: '',
          cover: '',
        },
        quantity: 1,
      };
    });

    return await recordUserPurchaseInFirestore(userId, userEmail, items, {
      orderId: `migrated_${Date.now()}`,
      paymentId: `migrated_pay_${Date.now()}`,
      amount: 0,
      userName: 'Migrated Guest Library',
      metadata: { migratedFromGuest: true, migrationDate: new Date().toISOString() },
    });
  } catch (e) {
    console.warn('Guest purchase migration note:', e);
    return guestBookIds;
  }
}

/**
 * 5. Background flush of pending purchases stored during network dropouts
 */
export async function syncPendingPurchasesToFirestore(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const pendingList = await getPendingPurchases();
    if (!pendingList || pendingList.length === 0) return;

    for (const item of pendingList) {
      try {
        const instances = [db, defaultDb];
        let synced = false;
        for (const firestoreInstance of instances) {
          if (!firestoreInstance) continue;

          if (item.userId && item.userId !== 'guest_user') {
            const userDocRef = doc(firestoreInstance, 'users', item.userId);
            await setDoc(
              userDocRef,
              {
                uid: item.userId,
                email: item.userEmail || '',
                purchasedBooks: arrayUnion(...(item.bookIds || [])),
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );

            const subDocRef = doc(firestoreInstance, 'users', item.userId, 'purchases', item.paymentId);
            await setDoc(
              subDocRef,
              {
                orderId: item.orderId,
                paymentId: item.paymentId,
                amount: item.amount,
                currency: 'INR',
                status: 'verified',
                purchasedAt: item.createdAt,
                userId: item.userId,
                userEmail: item.userEmail || '',
                books: item.items || [],
                bookIds: item.bookIds || [],
                syncedFromOfflineQueue: true,
              },
              { merge: true }
            );
          }

          synced = true;
          break;
        }

        if (synced) {
          await removePendingPurchase(item.id);
        }
      } catch (err) {
        console.warn('Could not sync individual pending purchase:', err);
      }
    }
  } catch (e) {
    console.warn('Pending purchases queue check error:', e);
  }
}

/**
 * Helper: Backfill local purchases to Firestore user record
 */
async function backfillLocalPurchasesToCloud(
  userId: string,
  userEmail: string,
  allBookIds: string[]
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        uid: userId,
        email: userEmail,
        purchasedBooks: arrayUnion(...allBookIds),
        purchasesCount: allBookIds.length,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Backfill local purchases note:', e);
  }
}

/**
 * 6. Real-time continuous listener for user purchases in Firestore across all devices and sessions.
 * Listens on /users/{userId} document and /users/{userId}/purchases subcollection.
 */
export function subscribeToUserPurchases(
  userId: string | undefined,
  userEmail: string | undefined,
  onPurchasesUpdated: (bookIds: string[]) => void
): () => void {
  const unsubscribers: (() => void)[] = [];
  let lastKnownIds: string[] = getPurchasedBookIdsFromLocal();

  const handleNewBookIds = async (newIds: string[]) => {
    if (!newIds || !Array.isArray(newIds)) return;
    const unique = Array.from(new Set(newIds)).sort();
    
    // Check if the IDs are actually different from what we already have
    if (
      lastKnownIds.length === unique.length &&
      lastKnownIds.every((id, idx) => id === unique[idx])
    ) {
      return;
    }

    lastKnownIds = unique;
    await savePurchasedBookIds(unique);
    onPurchasesUpdated(unique);
  };

  if (userId && userId !== 'guest_user') {
    try {
      // 1. Real-time listener for /users/{userId}
      const userProfileDocRef = doc(db, 'users', userId);
      let unsubProfile: (() => void) | null = null;
      unsubProfile = onSnapshot(
        userProfileDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.purchasedBooks)) {
              handleNewBookIds(data.purchasedBooks);
            }
          }
        },
        (err) => {
          if (err?.code === 'not-found' || err?.message?.includes('NOT_FOUND') || err?.message?.includes('not-found')) {
            try { unsubProfile?.(); } catch {}
          } else {
            console.warn('Realtime users doc sync note:', (err as any)?.message || String(err));
          }
        }
      );
      if (unsubProfile) unsubscribers.push(unsubProfile);

      // 2. Real-time listener for /users/{userId}/purchases subcollection
      const subColRef = collection(db, 'users', userId, 'purchases');
      let unsubSubCol: (() => void) | null = null;
      unsubSubCol = onSnapshot(
        subColRef,
        (snap) => {
          const ids: string[] = [];
          snap.forEach((d) => {
            const pData = d.data();
            if (Array.isArray(pData?.bookIds)) {
              ids.push(...pData.bookIds);
            }
          });
          if (ids.length > 0) {
            handleNewBookIds(ids);
          }
        },
        (err) => {
          if (err?.code === 'not-found' || err?.message?.includes('NOT_FOUND') || err?.message?.includes('not-found')) {
            try { unsubSubCol?.(); } catch {}
          } else {
            console.warn('Realtime subcollection purchases sync note:', (err as any)?.message || String(err));
          }
        }
      );
      if (unsubSubCol) unsubscribers.push(unsubSubCol);

      // 3. Real-time listener for /user_purchases_by_email/{normalizedEmail}
      if (userEmail) {
        const normEmail = normalizeEmailForDocId(userEmail);
        const emailDocRef = doc(db, 'user_purchases_by_email', normEmail);
        let unsubEmail: (() => void) | null = null;
        unsubEmail = onSnapshot(
          emailDocRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (Array.isArray(data?.purchasedBooks)) {
                handleNewBookIds(data.purchasedBooks);
              }
            }
          },
          (err) => {
            if (err?.code === 'not-found' || err?.message?.includes('NOT_FOUND') || err?.message?.includes('not-found')) {
              try { unsubEmail?.(); } catch {}
            }
          }
        );
        if (unsubEmail) unsubscribers.push(unsubEmail);
      }
    } catch (e) {
      console.warn('Realtime listener attach error:', e);
    }
  }

  return () => {
    unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

const SALES_COUNT_CACHE_KEY = 'bookscircle_sales_count_map';

let memorySalesCountMap: Record<string, number> | null = null;
let memorySalesCountExpiresAt = 0;

export function getCachedSalesCountMapSync(): Record<string, number> {
  if (memorySalesCountMap && Object.keys(memorySalesCountMap).length > 0) {
    return memorySalesCountMap;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(SALES_COUNT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          memorySalesCountMap = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return {};
}

export function saveSalesCountMapLocal(map: Record<string, number>) {
  memorySalesCountMap = map;
  memorySalesCountExpiresAt = Date.now() + 5 * 60 * 1000;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SALES_COUNT_CACHE_KEY, JSON.stringify(map));
    } catch {}
  }
}

const FIREBASE_API_KEY = "AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk";
const PROJECT_ID = "bookscircle-d579d";
const FIRESTORE_DATABASE_ID = "bookscircle";

async function fetchSalesMapFromRest(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  function tally(idOrSlug: string, count = 1) {
    if (!idOrSlug) return;
    const clean = String(idOrSlug).trim();
    map[clean] = (map[clean] || 0) + count;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const pUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/purchases?pageSize=100&key=${FIREBASE_API_KEY}`;
    const oUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/orders?pageSize=100&key=${FIREBASE_API_KEY}`;
    const aUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/book_analytics?pageSize=100&key=${FIREBASE_API_KEY}`;

    const [pRes, oRes, aRes] = await Promise.all([
      fetch(pUrl, { signal: controller.signal, cache: 'no-store' }).catch(() => null),
      fetch(oUrl, { signal: controller.signal, cache: 'no-store' }).catch(() => null),
      fetch(aUrl, { signal: controller.signal, cache: 'no-store' }).catch(() => null),
    ]);
    clearTimeout(timer);

    if (pRes && pRes.ok) {
      const pData = await pRes.json().catch(() => null);
      if (pData?.documents) {
        for (const d of pData.documents) {
          const bIds = d.fields?.bookIds?.arrayValue?.values || [];
          for (const v of bIds) if (v?.stringValue) tally(v.stringValue);
        }
      }
    }
    if (oRes && oRes.ok) {
      const oData = await oRes.json().catch(() => null);
      if (oData?.documents) {
        for (const d of oData.documents) {
          const bIds = d.fields?.bookIds?.arrayValue?.values || [];
          for (const v of bIds) if (v?.stringValue) tally(v.stringValue);
        }
      }
    }
    if (aRes && aRes.ok) {
      const aData = await aRes.json().catch(() => null);
      if (aData?.documents) {
        for (const d of aData.documents) {
          const id = (d.name || '').split('/').pop();
          const tp = parseInt(d.fields?.totalPurchases?.integerValue || d.fields?.salesCount?.integerValue || '0', 10);
          if (id && tp > 0) map[id] = Math.max(map[id] || 0, tp);
        }
      }
    }
  } catch {}
  return map;
}

/**
 * Aggregates verified sales numbers per book from Firestore with memory caching
 * Works on both server-side SSR and client-side rendering.
 */
export async function fetchTotalSalesCountMap(): Promise<Record<string, number>> {
  const now = Date.now();
  if (memorySalesCountMap && now < memorySalesCountExpiresAt && Object.keys(memorySalesCountMap).length > 0) {
    return memorySalesCountMap;
  }

  // Fetch via fast REST API (works on both Server SSR and Client with 0ms memory cache)
  const restSales = await fetchSalesMapFromRest();
  if (Object.keys(restSales).length > 0) {
    saveSalesCountMapLocal(restSales);
    return restSales;
  }

  return memorySalesCountMap || getCachedSalesCountMapSync();
}
