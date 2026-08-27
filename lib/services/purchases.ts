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
} from 'firebase/firestore';
import { db, defaultDb } from '../firebase';
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

  const purchaseRecord: PurchaseRecord = {
    orderId: paymentInfo.orderId || `ord_${Date.now()}`,
    paymentId: paymentInfo.paymentId || `pay_${Date.now()}`,
    amount: paymentInfo.amount || 0,
    currency: 'INR',
    status: paymentInfo.status || 'verified',
    purchasedAt: now,
    userId: userId || 'guest_user',
    userEmail: userEmail || 'user@bookscircle.org',
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

  // 2. Persist in Firestore across databases with failover
  let recordedInCloud = false;
  const instances = [db, defaultDb];

  for (const firestoreInstance of instances) {
    if (!firestoreInstance) continue;
    try {
      // A. Master transaction log: /purchases/{paymentId}
      const purchaseDocRef = doc(firestoreInstance, 'purchases', purchaseRecord.paymentId);
      await setDoc(purchaseDocRef, purchaseRecord, { merge: true });

      // B. Also write by orderId if different: /orders/{orderId}
      if (purchaseRecord.orderId && purchaseRecord.orderId !== purchaseRecord.paymentId) {
        const orderDocRef = doc(firestoreInstance, 'orders', purchaseRecord.orderId);
        await setDoc(orderDocRef, purchaseRecord, { merge: true });
      }

      // C. User consolidated entitlements: /user_purchases/{userId}
      if (userId && userId !== 'guest_user') {
        const userDocRef = doc(firestoreInstance, 'user_purchases', userId);
        const existingDoc = await getDoc(userDocRef);

        if (existingDoc.exists()) {
          const currentData = existingDoc.data();
          const existingIds: string[] = Array.isArray(currentData?.bookIds) ? currentData.bookIds : [];
          const updatedIds = Array.from(new Set([...existingIds, ...bookIds]));

          await updateDoc(userDocRef, {
            bookIds: arrayUnion(...bookIds),
            totalBooksCount: updatedIds.length,
            lastPurchasedAt: now,
            lastOrderId: purchaseRecord.orderId,
            lastPaymentId: purchaseRecord.paymentId,
            userEmail: userEmail || currentData.userEmail,
            orders: arrayUnion(orderSummaryEntry),
          });
        } else {
          await setDoc(userDocRef, {
            userId,
            userEmail,
            bookIds,
            totalBooksCount: bookIds.length,
            createdAt: now,
            lastPurchasedAt: now,
            lastOrderId: purchaseRecord.orderId,
            lastPaymentId: purchaseRecord.paymentId,
            orders: [orderSummaryEntry],
          });
        }
      }

      // D. User consolidated index by email: /user_purchases_by_email/{emailKey}
      if (userEmail && userEmail !== 'user@bookscircle.org') {
        const emailKey = normalizeEmailForDocId(userEmail);
        const emailDocRef = doc(firestoreInstance, 'user_purchases_by_email', emailKey);
        const existingEmailDoc = await getDoc(emailDocRef);

        if (existingEmailDoc.exists()) {
          const currentEmailData = existingEmailDoc.data();
          const existingIds: string[] = Array.isArray(currentEmailData?.bookIds) ? currentEmailData.bookIds : [];
          const updatedIds = Array.from(new Set([...existingIds, ...bookIds]));

          await updateDoc(emailDocRef, {
            bookIds: arrayUnion(...bookIds),
            totalBooksCount: updatedIds.length,
            lastPurchasedAt: now,
            userId: userId || currentEmailData.userId,
            userEmail,
            orders: arrayUnion(orderSummaryEntry),
          });
        } else {
          await setDoc(
            emailDocRef,
            {
              userEmail,
              userId: userId || 'guest_user',
              bookIds,
              totalBooksCount: bookIds.length,
              createdAt: now,
              lastPurchasedAt: now,
              orders: [orderSummaryEntry],
            },
            { merge: true }
          );
        }
      }

      // E. Update book analytics & purchase counters: /book_analytics/{bookId}
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
      break; // Primary or secondary instance written successfully
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
  return allPurchased;
}

/**
 * 2. Fetch and merge purchased book IDs for a user from Firestore & local storage.
 * Performs dual lookup (by userId and by userEmail) to guarantee multi-device restoration.
 */
export async function syncUserPurchases(userId?: string, userEmail?: string): Promise<string[]> {
  const localPurchased = getPurchasedBookIdsFromLocal();
  const remoteBookIds: string[] = [];

  // Also trigger flush of any pending purchases recorded while offline
  syncPendingPurchasesToFirestore().catch(() => {});

  if (userId || userEmail) {
    const instances = [db, defaultDb];
    for (const firestoreInstance of instances) {
      if (!firestoreInstance) continue;
      try {
        // A. Check user ID document
        if (userId && userId !== 'guest_user') {
          const userDocRef = doc(firestoreInstance, 'user_purchases', userId);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.bookIds)) {
              remoteBookIds.push(...data.bookIds);
            }
          }
        }

        // B. Check user email document
        if (userEmail && userEmail !== 'user@bookscircle.org') {
          const emailKey = normalizeEmailForDocId(userEmail);
          const emailDocRef = doc(firestoreInstance, 'user_purchases_by_email', emailKey);
          const snap = await getDoc(emailDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.bookIds)) {
              remoteBookIds.push(...data.bookIds);
            }
          }
        }

        // C. If user has purchase records in master /purchases collection
        if (remoteBookIds.length === 0 && (userId || userEmail)) {
          try {
            const purchasesCol = collection(firestoreInstance, 'purchases');
            const q = userEmail
              ? query(purchasesCol, where('userEmail', '==', userEmail))
              : query(purchasesCol, where('userId', '==', userId));
            const querySnap = await getDocs(q);
            querySnap.forEach((d) => {
              const pData = d.data();
              if (Array.isArray(pData?.bookIds)) {
                remoteBookIds.push(...pData.bookIds);
              }
            });
          } catch (queryErr) {
            // Non-critical query error
          }
        }

        if (remoteBookIds.length > 0) break;
      } catch (err) {
        console.warn('Could not sync user purchases from cloud:', err);
      }
    }
  }

  const combined = Array.from(new Set([...localPurchased, ...remoteBookIds]));

  // If remote returned book IDs not yet in local storage, save them locally
  if (combined.length > localPurchased.length) {
    await savePurchasedBookIds(combined);
  }

  // If local had books but user is signed in and remote was missing them, backfill to user's cloud account
  if (userId && userId !== 'guest_user' && localPurchased.length > 0 && remoteBookIds.length < combined.length) {
    backfillLocalPurchasesToCloud(userId, userEmail || 'user@bookscircle.org', combined).catch(() => {});
  }

  return combined;
}

/**
 * 3. Retrieve complete user purchase transaction history and invoices from Firestore
 */
export async function getUserPurchaseHistory(
  userId?: string,
  userEmail?: string
): Promise<PurchaseRecord[]> {
  const records: PurchaseRecord[] = [];
  const seenPaymentIds = new Set<string>();

  if (!userId && !userEmail) return [];

  const instances = [db, defaultDb];
  for (const firestoreInstance of instances) {
    if (!firestoreInstance) continue;
    try {
      const purchasesCol = collection(firestoreInstance, 'purchases');

      if (userEmail && userEmail !== 'user@bookscircle.org') {
        const qEmail = query(purchasesCol, where('userEmail', '==', userEmail));
        const emailSnap = await getDocs(qEmail);
        emailSnap.forEach((docSnap) => {
          const data = docSnap.data() as PurchaseRecord;
          if (!seenPaymentIds.has(data.paymentId)) {
            seenPaymentIds.add(data.paymentId);
            records.push(data);
          }
        });
      }

      if (userId && userId !== 'guest_user') {
        const qUser = query(purchasesCol, where('userId', '==', userId));
        const userSnap = await getDocs(qUser);
        userSnap.forEach((docSnap) => {
          const data = docSnap.data() as PurchaseRecord;
          if (!seenPaymentIds.has(data.paymentId)) {
            seenPaymentIds.add(data.paymentId);
            records.push(data);
          }
        });
      }

      if (records.length > 0) break;
    } catch (err) {
      console.warn('Error fetching user purchase history:', err);
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
          const purchaseDocRef = doc(firestoreInstance, 'purchases', item.paymentId);
          await setDoc(
            purchaseDocRef,
            {
              orderId: item.orderId,
              paymentId: item.paymentId,
              amount: item.amount,
              currency: 'INR',
              status: 'verified',
              purchasedAt: item.createdAt,
              userId: item.userId || 'guest_user',
              userEmail: item.userEmail || 'user@bookscircle.org',
              books: item.items || [],
              bookIds: item.bookIds || [],
              syncedFromOfflineQueue: true,
            },
            { merge: true }
          );

          if (item.userId && item.userId !== 'guest_user') {
            const userDocRef = doc(firestoreInstance, 'user_purchases', item.userId);
            await setDoc(
              userDocRef,
              {
                userId: item.userId,
                userEmail: item.userEmail,
                bookIds: arrayUnion(...(item.bookIds || [])),
                lastUpdated: new Date().toISOString(),
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
      const userDocRef = doc(firestoreInstance, 'user_purchases', userId);
      await setDoc(
        userDocRef,
        {
          userId,
          userEmail,
          bookIds: arrayUnion(...allBookIds),
          totalBooksCount: allBookIds.length,
          lastUpdated: now,
        },
        { merge: true }
      );

      if (userEmail && userEmail !== 'user@bookscircle.org') {
        const emailKey = normalizeEmailForDocId(userEmail);
        const emailDocRef = doc(firestoreInstance, 'user_purchases_by_email', emailKey);
        await setDoc(
          emailDocRef,
          {
            userEmail,
            userId,
            bookIds: arrayUnion(...allBookIds),
            totalBooksCount: allBookIds.length,
            lastUpdated: now,
          },
          { merge: true }
        );
      }
      break;
    } catch (e) {
      console.warn('Backfill local purchases note:', e);
    }
  }
}
