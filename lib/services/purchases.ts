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

export interface PurchaseItemDetail {
  id: string;
  title: string;
  slug?: string;
  price: number;
  category?: string;
  pdf_file?: string;
  pdfStoragePath?: string;
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

  // 2. Persist in Firestore user document and subcollection across database instances
  let recordedInCloud = false;
  const instances = [db, defaultDb].filter(Boolean);

  for (const firestoreInstance of instances) {
    if (!firestoreInstance) continue;
    try {
      // 1. /users/{userId} & subcollection /users/{userId}/purchases/{paymentId}
      if (effectiveUserId && effectiveUserId !== 'guest_user') {
        const userProfileDocRef = doc(firestoreInstance, 'users', effectiveUserId);
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
          firestoreInstance,
          'users',
          effectiveUserId,
          'purchases',
          purchaseRecord.paymentId
        );
        await setDoc(userPurchaseSubDocRef, purchaseRecord, { merge: true });

        // 2. Top-level /user_purchases/{userId}
        const userPurchasesDocRef = doc(firestoreInstance, 'user_purchases', effectiveUserId);
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
          const emailPurchasesDocRef = doc(firestoreInstance, 'user_purchases_by_email', normEmail);
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
      const topPurchaseDocRef = doc(firestoreInstance, 'purchases', purchaseRecord.paymentId);
      await setDoc(topPurchaseDocRef, purchaseRecord, { merge: true });

      // 5. Top-level /orders/{orderId}
      const topOrderDocRef = doc(firestoreInstance, 'orders', purchaseRecord.orderId);
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
          const analyticsDocRef = doc(firestoreInstance, 'book_analytics', item.book.id);
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
      console.warn('Firestore cloud purchase sync attempt error:', err);
    }
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
 * 2. Fetch purchased book IDs for a user directly from Firebase DB collections.
 * Performs lookup across /users/{userId}, /users/{userId}/purchases, /user_purchases/{userId},
 * and /user_purchases_by_email/{normalizedEmail}.
 */
export async function syncUserPurchases(userId?: string, userEmail?: string): Promise<string[]> {
  const localPurchased = getPurchasedBookIdsFromLocal();
  const remoteBookIds: string[] = [];

  // Also trigger flush of any pending purchases recorded while offline
  syncPendingPurchasesToFirestore().catch(() => {});

  if (userId && userId !== 'guest_user') {
    const instances = [db, defaultDb].filter(Boolean);
    for (const firestoreInstance of instances) {
      if (!firestoreInstance) continue;
      try {
        // A. Check primary user document: /users/{userId}
        const userDocRef = doc(firestoreInstance, 'users', userId);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.purchasedBooks)) {
            remoteBookIds.push(...data.purchasedBooks);
          }
        }

        // B. Check subcollection /users/{userId}/purchases
        try {
          const subColRef = collection(firestoreInstance, 'users', userId, 'purchases');
          const subSnap = await getDocs(subColRef);
          subSnap.forEach((d) => {
            const pData = d.data();
            if (Array.isArray(pData?.bookIds)) {
              remoteBookIds.push(...pData.bookIds);
            }
          });
        } catch (subErr) {}

        // C. Check /user_purchases/{userId}
        try {
          const upRef = doc(firestoreInstance, 'user_purchases', userId);
          const upSnap = await getDoc(upRef);
          if (upSnap.exists()) {
            const upData = upSnap.data();
            if (Array.isArray(upData?.purchasedBooks)) {
              remoteBookIds.push(...upData.purchasedBooks);
            }
          }
        } catch (upErr) {}

        // D. Check /user_purchases_by_email/{normalizedEmail}
        if (userEmail) {
          try {
            const normEmail = normalizeEmailForDocId(userEmail);
            const emailDocRef = doc(firestoreInstance, 'user_purchases_by_email', normEmail);
            const emailSnap = await getDoc(emailDocRef);
            if (emailSnap.exists()) {
              const eData = emailSnap.data();
              if (Array.isArray(eData?.purchasedBooks)) {
                remoteBookIds.push(...eData.purchasedBooks);
              }
            }
          } catch (eErr) {}
        }

        if (remoteBookIds.length > 0) break;
      } catch (err) {
        console.warn('Could not sync user purchases from cloud:', err);
      }
    }
  }

  const uniqueRemoteIds = Array.from(new Set(remoteBookIds));

  // If user is authenticated, purchase list comes directly from Firebase collections
  if (userId && userId !== 'guest_user') {
    await savePurchasedBookIds(uniqueRemoteIds);
    return uniqueRemoteIds;
  }

  // Fallback for guest users without an account: return local storage
  return Array.from(new Set(localPurchased));
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

  const instances = [db, defaultDb];
  for (const firestoreInstance of instances) {
    if (!firestoreInstance) continue;
    try {
      const subColRef = collection(firestoreInstance, 'users', userId, 'purchases');
      const subSnap = await getDocs(subColRef);
      subSnap.forEach((docSnap) => {
        const data = docSnap.data() as PurchaseRecord;
        if (data.paymentId && !seenPaymentIds.has(data.paymentId)) {
          seenPaymentIds.add(data.paymentId);
          records.push(data);
        }
      });

      if (records.length > 0) break;
    } catch (err) {
      console.warn('Error fetching user purchase history from subcollection:', err);
    }
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
  const instances = [db, defaultDb];
  const now = new Date().toISOString();
  for (const firestoreInstance of instances) {
    if (!firestoreInstance) continue;
    try {
      const userDocRef = doc(firestoreInstance, 'users', userId);
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
      break;
    } catch (e) {
      console.warn('Backfill local purchases note:', e);
    }
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

  const handleNewBookIds = async (newIds: string[]) => {
    if (!newIds || !Array.isArray(newIds)) return;
    const unique = Array.from(new Set(newIds));
    if (unique.length > 0) {
      await savePurchasedBookIds(unique);
      onPurchasesUpdated(unique);
    }
  };

  const instances = [db, defaultDb].filter(Boolean);

  instances.forEach((firestoreInstance) => {
    if (!firestoreInstance) return;

    if (userId && userId !== 'guest_user') {
      try {
        // 1. Real-time listener for /users/{userId}
        const userProfileDocRef = doc(firestoreInstance, 'users', userId);
        const unsubProfile = onSnapshot(
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
            console.warn('Realtime users doc sync note:', err?.message || err);
          }
        );
        unsubscribers.push(unsubProfile);

        // 2. Real-time listener for /users/{userId}/purchases subcollection
        const subColRef = collection(firestoreInstance, 'users', userId, 'purchases');
        const unsubSubCol = onSnapshot(
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
            console.warn('Realtime subcollection purchases sync note:', err?.message || err);
          }
        );
        unsubscribers.push(unsubSubCol);

        // 3. Real-time listener for /user_purchases/{userId}
        const userPurchasesDocRef = doc(firestoreInstance, 'user_purchases', userId);
        const unsubUserPurchases = onSnapshot(
          userPurchasesDocRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (Array.isArray(data?.purchasedBooks)) {
                handleNewBookIds(data.purchasedBooks);
              }
            }
          },
          () => {}
        );
        unsubscribers.push(unsubUserPurchases);

        // 4. Real-time listener for /user_purchases_by_email/{normalizedEmail}
        if (userEmail) {
          const normEmail = normalizeEmailForDocId(userEmail);
          const emailDocRef = doc(firestoreInstance, 'user_purchases_by_email', normEmail);
          const unsubEmail = onSnapshot(
            emailDocRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                if (Array.isArray(data?.purchasedBooks)) {
                  handleNewBookIds(data.purchasedBooks);
                }
              }
            },
            () => {}
          );
          unsubscribers.push(unsubEmail);
        }
      } catch (e) {
        console.warn('Realtime listener attach error:', e);
      }
    }
  });

  return () => {
    unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}
