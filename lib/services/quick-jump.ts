'use client';

import { auth } from '@/lib/firebase';
import { UserProfile } from '@/components/Header';
import { CartItem } from '@/lib/types';
import { savePurchasedBookIds } from '@/lib/offline-storage';
import { recordUserPurchaseInFirestore } from '@/lib/services/purchases';
import { removeFromCartAction } from '@/lib/services/cart';
import { triggerNativeLoading } from '@/components/NativePageLoadingIndicator';

export const PURCHASES_UPDATED_EVENT = 'bookscircle:purchases-updated';

/**
 * Verifies local auth state across Firebase Auth instance and local storage caches.
 * Returns the verified user profile or null if in guest mode.
 */
export function verifyLocalAuthState(): UserProfile | null {
  if (typeof window === 'undefined') return null;

  // 1. Verify active Firebase Auth client instance
  try {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      const user = auth.currentUser;
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Reader',
        photoURL: user.photoURL,
      };
      try {
        localStorage.setItem('bookscircle_auth_user', JSON.stringify(profile));
      } catch {}
      return profile;
    }
  } catch {}

  // 2. Verify stored local session
  try {
    const rawSaved =
      localStorage.getItem('bookscircle_auth_user') ||
      localStorage.getItem('bookscircle_user_session');

    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      if (parsed && typeof parsed === 'object' && (parsed.uid || parsed.email)) {
        return {
          uid: parsed.uid || `user_${Date.now()}`,
          email: parsed.email || null,
          displayName: parsed.displayName || parsed.email?.split('@')[0] || 'Reader',
          photoURL: parsed.photoURL || null,
        };
      }
    }
  } catch {}

  return null;
}

export interface QuickJumpOptions {
  itemsToBuy: CartItem[];
  bookIds?: string[];
  paymentData?: {
    order_id?: string;
    payment_id?: string;
    amountInRupees?: number;
  };
  currentUser?: UserProfile | null;
  router?: { push: (url: string) => void };
  onSuccessToast?: (msg: string) => void;
  onBeforeRedirect?: () => void;
}

/**
 * Quick-Jump purchase completion handler:
 * 1. Verifies local auth state immediately.
 * 2. Synchronously updates and persists unlocked book IDs locally so library has 0ms latency.
 * 3. Removes purchased items from cart and emits cross-component update event.
 * 4. Dispatches background cloud Firestore purchase logging (non-blocking).
 * 5. Instantly redirects user to `/purchased` with native feedback, reducing time from transaction
 *    completion to content access to near-zero.
 */
export function executePurchaseQuickJump(options: QuickJumpOptions): void {
  const {
    itemsToBuy,
    bookIds = itemsToBuy.map((i) => i.book.id),
    paymentData,
    currentUser,
    router,
    onSuccessToast,
    onBeforeRedirect,
  } = options;

  if (bookIds.length === 0) return;

  // Step 1: Verify local auth state
  const verifiedUser = verifyLocalAuthState() || currentUser || null;
  const effectiveUserId = verifiedUser?.uid || 'guest_user';
  const effectiveUserEmail = verifiedUser?.email || '';
  const effectiveUserName = verifiedUser?.displayName || 'Reader';

  // Step 2: Instant local state write-ahead unlock
  const newPurchasedIds = Array.from(new Set(bookIds));
  savePurchasedBookIds(newPurchasedIds);

  // Clean purchased items from local cart
  newPurchasedIds.forEach((id) => {
    removeFromCartAction(id);
  });

  // Step 3: Broadcast reactive purchases updated event across window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PURCHASES_UPDATED_EVENT, {
        detail: {
          bookIds: newPurchasedIds,
          user: verifiedUser,
          paymentId: paymentData?.payment_id,
        },
      })
    );
  }

  // Step 4: Non-blocking asynchronous Firestore record dispatch
  recordUserPurchaseInFirestore(
    effectiveUserId,
    effectiveUserEmail,
    itemsToBuy,
    {
      orderId: paymentData?.order_id || `ord_${Date.now()}`,
      paymentId: paymentData?.payment_id || `pay_${Date.now()}`,
      amount: paymentData?.amountInRupees || 0,
      userName: effectiveUserName,
    }
  ).catch((err) => {
    console.warn('Background Firestore purchase sync note:', err);
  });

  // Step 5: Visual feedback
  triggerNativeLoading(120);
  if (onSuccessToast) {
    onSuccessToast('Purchase complete! Jumping to your library...');
  }

  if (onBeforeRedirect) {
    onBeforeRedirect();
  }

  // Step 6: Instant Quick-Jump redirect to /purchased
  if (router && typeof router.push === 'function') {
    router.push('/purchased');
  } else if (typeof window !== 'undefined') {
    window.location.href = '/purchased';
  }
}

/**
 * Helper hook / listener to react to quick-jump purchase updates anywhere in the app
 */
export function subscribeToPurchasesUpdated(
  callback: (newBookIds: string[], user?: UserProfile | null) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const custom = e as CustomEvent<{
      bookIds?: string[];
      user?: UserProfile | null;
    }>;
    if (custom.detail?.bookIds && custom.detail.bookIds.length > 0) {
      callback(custom.detail.bookIds, custom.detail.user);
    }
  };

  window.addEventListener(PURCHASES_UPDATED_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(PURCHASES_UPDATED_EVENT, handler as EventListener);
  };
}
