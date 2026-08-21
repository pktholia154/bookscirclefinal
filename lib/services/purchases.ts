import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db, defaultDb } from '../firebase';
import { getPurchasedBookIdsFromLocal, savePurchasedBookIds } from '../offline-storage';
import { CartItem } from '../types';

export interface PurchaseRecord {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  purchasedAt: string;
  userId: string;
  userEmail: string;
  books: {
    id: string;
    title: string;
    price: number;
  }[];
}

// 1. Save purchase to Firestore and local IndexedDB/localStorage
export async function recordUserPurchaseInFirestore(
  userId: string,
  userEmail: string,
  cartItems: CartItem[],
  paymentInfo: { orderId: string; paymentId: string; amount: number }
): Promise<string[]> {
  const bookIds = cartItems.map((item) => item.book.id);
  const now = new Date().toISOString();

  const purchaseRecord: PurchaseRecord = {
    orderId: paymentInfo.orderId,
    paymentId: paymentInfo.paymentId,
    amount: paymentInfo.amount,
    currency: 'INR',
    purchasedAt: now,
    userId: userId || 'guest_user',
    userEmail: userEmail || 'user@bookscircle.org',
    books: cartItems.map((item) => ({
      id: item.book.id,
      title: item.book.title,
      price: item.book.buy_price,
    })),
  };

  // First sync to local IndexedDB and localStorage immediately
  await savePurchasedBookIds(bookIds);

  // Sync to Firestore databases (both 'bookscircle' named instance and default)
  const instances = [db, defaultDb];
  for (const firestoreInstance of instances) {
    try {
      // Record transaction
      const purchaseDocRef = doc(firestoreInstance, 'purchases', paymentInfo.paymentId || `pay_${Date.now()}`);
      await setDoc(purchaseDocRef, purchaseRecord, { merge: true });

      // Record to user's dedicated purchases doc
      if (userId) {
        const userDocRef = doc(firestoreInstance, 'user_purchases', userId);
        const existingDoc = await getDoc(userDocRef);
        if (existingDoc.exists()) {
          await updateDoc(userDocRef, {
            bookIds: arrayUnion(...bookIds),
            lastUpdated: now,
            userEmail,
          });
        } else {
          await setDoc(userDocRef, {
            userId,
            userEmail,
            bookIds,
            createdAt: now,
            lastUpdated: now,
          });
        }
      }

      // Also index by user email for multi-account fallback
      if (userEmail) {
        const emailKey = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const emailDocRef = doc(firestoreInstance, 'user_purchases_by_email', emailKey);
        await setDoc(
          emailDocRef,
          {
            userEmail,
            bookIds: arrayUnion(...bookIds),
            lastUpdated: now,
          },
          { merge: true }
        );
      }
      break; // Successfully written to primary firestore instance
    } catch (err) {
      console.warn('Firestore cloud purchase sync attempt:', err);
    }
  }

  const allPurchased = Array.from(new Set([...getPurchasedBookIdsFromLocal(), ...bookIds]));
  return allPurchased;
}

// 2. Fetch and merge purchased book IDs for a logged-in user from Firestore & Local
export async function syncUserPurchases(userId?: string, userEmail?: string): Promise<string[]> {
  const localPurchased = getPurchasedBookIdsFromLocal();
  const remoteBookIds: string[] = [];

  if (userId || userEmail) {
    const instances = [db, defaultDb];
    for (const firestoreInstance of instances) {
      try {
        if (userId) {
          const userDocRef = doc(firestoreInstance, 'user_purchases', userId);
          const snap = await getDoc(userDocRef);
          if (snap.exists() && Array.isArray(snap.data()?.bookIds)) {
            remoteBookIds.push(...snap.data().bookIds);
          }
        }

        if (userEmail) {
          const emailKey = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const emailDocRef = doc(firestoreInstance, 'user_purchases_by_email', emailKey);
          const snap = await getDoc(emailDocRef);
          if (snap.exists() && Array.isArray(snap.data()?.bookIds)) {
            remoteBookIds.push(...snap.data().bookIds);
          }
        }

        if (remoteBookIds.length > 0) break;
      } catch (err) {
        console.warn('Could not sync user purchases from cloud:', err);
      }
    }
  }

  const combined = Array.from(new Set([...localPurchased, ...remoteBookIds]));
  if (combined.length > localPurchased.length) {
    await savePurchasedBookIds(combined);
  }
  return combined;
}
