'use client';

import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CartTierDiscount, DiscountTier, Book } from '../types';

export const CART_TIER_DISCOUNT_CACHE_KEY = 'bookscircle_cart_tier_discount';
export const DISCOUNT_SYNC_EVENT = 'bookscircle:discount-sync';

export const DEFAULT_CART_TIER_DISCOUNT: CartTierDiscount = {
  id: 'default-cart-tier',
  title: 'Mega Diwali Sale',
  is_active: true,
  tiers: [
    { discount_pct: 50, label: '50% OFF on ₹2000+', min_total: 2000 },
    { discount_pct: 40, label: '40% OFF on ₹1000+', min_total: 1000 },
    { discount_pct: 20, label: '20% OFF on ₹500+', min_total: 500 },
  ],
};

/**
 * Normalizes tier items and sorts them descending by min_total.
 */
export function normalizeTiers(rawTiers: any[]): DiscountTier[] {
  if (!Array.isArray(rawTiers)) return [];
  return rawTiers
    .map((t) => ({
      discount_pct: Number(t.discount_pct || t.discountPct || 0),
      label: String(t.label || `${t.discount_pct}% OFF on ₹${t.min_total}+`),
      min_total: Number(t.min_total || t.minTotal || 0),
    }))
    .filter((t) => t.discount_pct > 0 && t.min_total > 0)
    .sort((a, b) => b.min_total - a.min_total);
}

/**
 * Parses and validates Firestore document into a CartTierDiscount.
 */
export function parseCartTierDiscountDoc(id: string, data: any): CartTierDiscount | null {
  if (!data) return null;
  const tiers = normalizeTiers(data.tiers);
  return {
    id,
    title: String(data.title || 'Special Discount Offer'),
    // Consider active unless explicitly set to false
    is_active: data.is_active !== false,
    tiers: tiers.length > 0 ? tiers : DEFAULT_CART_TIER_DISCOUNT.tiers,
    created_at: data.created_at,
  };
}

/**
 * Reads cached CartTierDiscount from localStorage.
 */
export function getCachedCartTierDiscountSync(): CartTierDiscount {
  if (typeof window === 'undefined') return DEFAULT_CART_TIER_DISCOUNT;
  try {
    const raw = localStorage.getItem(CART_TIER_DISCOUNT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tiers) && parsed.tiers.length > 0) {
        return {
          ...parsed,
          tiers: normalizeTiers(parsed.tiers),
        };
      }
    }
  } catch (e) {
    console.warn('Failed to read cart tier discount cache:', e);
  }
  return DEFAULT_CART_TIER_DISCOUNT;
}

/**
 * Saves CartTierDiscount to local cache and broadcasts event.
 */
export function saveCartTierDiscountToCache(discount: CartTierDiscount): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_TIER_DISCOUNT_CACHE_KEY, JSON.stringify(discount));
    window.dispatchEvent(
      new CustomEvent(DISCOUNT_SYNC_EVENT, {
        detail: discount,
      })
    );
  } catch (e) {
    console.warn('Failed to save cart tier discount cache:', e);
  }
}

/**
 * Real-time listener for Firestore `discounts` collection.
 */
export function subscribeToFirestoreDiscounts(
  callback: (discount: CartTierDiscount | null) => void
): () => void {
  // Always emit cached value first
  callback(getCachedCartTierDiscountSync());

  try {
    const discountsCol = collection(db, 'discounts');
    const unsubscribe = onSnapshot(
      discountsCol,
      (snapshot) => {
        let selectedDiscount: CartTierDiscount | null = null;

        if (!snapshot.empty) {
          const discountList: CartTierDiscount[] = [];
          snapshot.forEach((docSnap) => {
            const parsed = parseCartTierDiscountDoc(docSnap.id, docSnap.data());
            if (parsed && parsed.tiers.length > 0) {
              discountList.push(parsed);
            }
          });

          // Prefer an active discount if available
          const active = discountList.find((d) => d.is_active);
          selectedDiscount = active || discountList[0] || null;
        }

        if (selectedDiscount) {
          saveCartTierDiscountToCache(selectedDiscount);
          callback(selectedDiscount);
        } else {
          callback(getCachedCartTierDiscountSync());
        }
      },
      (error) => {
        console.warn('Firestore discounts listener note:', error?.message);
        callback(getCachedCartTierDiscountSync());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Discounts subscription error:', err);
    callback(getCachedCartTierDiscountSync());
    return () => {};
  }
}

export interface CartTierEvaluation {
  subtotal: number;
  activeTier: DiscountTier | null;
  nextTier: DiscountTier | null;
  applicable_discount_pct: number;
  discountAmount: number;
  finalTotal: number;
  amountNeededForNextTier: number;
  nudgeMessage: string;
  progressPct: number;
  isEligible: boolean;
}

/**
 * Evaluates the current cart subtotal against the discount tiers.
 */
export function evaluateCartTier(
  cartSubtotal: number,
  discountConfig?: CartTierDiscount | null
): CartTierEvaluation {
  const config = discountConfig || getCachedCartTierDiscountSync();
  const rawTiers = config?.tiers || DEFAULT_CART_TIER_DISCOUNT.tiers;
  const tiers = [...rawTiers].sort((a, b) => b.min_total - a.min_total); // Descending (e.g. 2000, 1000, 500)
  const ascendingTiers = [...rawTiers].sort((a, b) => a.min_total - b.min_total); // Ascending (e.g. 500, 1000, 2000)

  // Find the highest tier that cartSubtotal meets or exceeds
  const activeTier = tiers.find((t) => cartSubtotal >= t.min_total) || null;
  const applicable_discount_pct = activeTier ? activeTier.discount_pct : 0;
  const discountAmount = Math.round(cartSubtotal * (applicable_discount_pct / 100));
  const finalTotal = Math.max(0, cartSubtotal - discountAmount);

  // Find the next tier higher than current active tier
  let nextTier: DiscountTier | null = null;
  if (!activeTier) {
    nextTier = ascendingTiers[0] || null;
  } else {
    nextTier = ascendingTiers.find((t) => t.min_total > activeTier.min_total) || null;
  }

  let amountNeededForNextTier = 0;
  let nudgeMessage = '';
  let progressPct = 0;

  if (cartSubtotal === 0) {
    const firstTier = ascendingTiers[0];
    amountNeededForNextTier = firstTier ? firstTier.min_total : 500;
    nudgeMessage = firstTier
      ? `Add ₹${amountNeededForNextTier} more to cart to get ${firstTier.discount_pct}% OFF instantly!`
      : 'Add books to cart to unlock instant tier discounts!';
    progressPct = 0;
  } else if (!activeTier && nextTier) {
    amountNeededForNextTier = Math.max(0, nextTier.min_total - cartSubtotal);
    nudgeMessage = `Add ₹${amountNeededForNextTier} more to unlock ${nextTier.discount_pct}% OFF at checkout!`;
    progressPct = Math.min(99, Math.round((cartSubtotal / nextTier.min_total) * 100));
  } else if (activeTier && nextTier) {
    amountNeededForNextTier = Math.max(0, nextTier.min_total - cartSubtotal);
    nudgeMessage = `🔥 ${activeTier.discount_pct}% OFF applied! Add ₹${amountNeededForNextTier} more to reach ${nextTier.discount_pct}% OFF!`;
    const span = nextTier.min_total - activeTier.min_total;
    const gained = cartSubtotal - activeTier.min_total;
    progressPct = Math.min(99, Math.round((gained / span) * 100));
  } else if (activeTier && !nextTier) {
    // Highest tier reached
    amountNeededForNextTier = 0;
    nudgeMessage = `🎉 Maximum ${activeTier.discount_pct}% OFF discount unlocked for your entire cart!`;
    progressPct = 100;
  } else {
    nudgeMessage = 'Add books to cart to unlock automatic volume discounts!';
    progressPct = 0;
  }

  return {
    subtotal: cartSubtotal,
    activeTier,
    nextTier,
    applicable_discount_pct,
    discountAmount,
    finalTotal,
    amountNeededForNextTier,
    nudgeMessage,
    progressPct,
    isEligible: applicable_discount_pct > 0,
  };
}

// Aliases for compatibility
export const getCachedDiscountsSync = () => [getCachedCartTierDiscountSync()];
export const isDiscountActive = (d: any) => d?.is_active !== false;
export const filterActiveDiscounts = (list: any[]) => list.filter(isDiscountActive);
