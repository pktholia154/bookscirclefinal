'use client';

import { Book, CartItem } from '../types';
import { getPurchasedBookIdsFromLocal } from '../offline-storage';

export const CART_STORAGE_KEY = 'bookscircle_cart';
export const CART_SYNC_EVENT = 'bookscircle:cart-sync';

/**
 * Reads and deduplicates cart from localStorage.
 * For digital eBooks/PDFs, each title has a maximum quantity of 1.
 */
export function getCartFromLocal(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Deduplicate items by book.id and ensure quantity = 1 for digital products
    const seen = new Set<string>();
    const deduplicated: CartItem[] = [];

    for (const item of parsed) {
      if (item && item.book && item.book.id && !seen.has(item.book.id)) {
        seen.add(item.book.id);
        deduplicated.push({
          book: item.book,
          quantity: 1, // Digital license rule: 1 copy per eBook
        });
      }
    }
    return deduplicated;
  } catch (e) {
    console.warn('Failed to parse cart from localStorage:', e);
    return [];
  }
}

export const getCartItemsFromLocal = getCartFromLocal;

/**
 * Filter out any already-purchased books from cart
 */
export function syncCartWithPurchases(
  cart: CartItem[],
  purchasedIds: string[]
): CartItem[] {
  if (!purchasedIds || purchasedIds.length === 0) return cart;
  const purchasedSet = new Set(purchasedIds);
  const filtered = cart.filter((item) => !purchasedSet.has(item.book.id));
  if (filtered.length !== cart.length) {
    saveCartToLocal(filtered);
  }
  return filtered;
}

/**
 * Saves cart to localStorage and broadcasts event to all components & tabs.
 */
export function saveCartToLocal(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Ensure strict deduplication and digital 1-copy limit
    const seen = new Set<string>();
    const cleanCart: CartItem[] = [];
    for (const item of cart) {
      if (item && item.book && item.book.id && !seen.has(item.book.id)) {
        seen.add(item.book.id);
        cleanCart.push({
          book: item.book,
          quantity: 1,
        });
      }
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cleanCart));

    // Dispatch custom event for real-time in-app sync across all mounted components
    window.dispatchEvent(
      new CustomEvent(CART_SYNC_EVENT, {
        detail: cleanCart,
      })
    );
  } catch (e) {
    console.warn('Failed to save cart to localStorage:', e);
  }
}

export interface CartActionResult {
  cart: CartItem[];
  updatedCart: CartItem[];
  status: 'added' | 'removed' | 'already_in_cart' | 'already_owned';
  message: string;
  isNewItem: boolean;
}

/**
 * Smart Add-to-Cart with digital product deduplication and ownership check
 */
export function addToCartAction(
  arg1: CartItem[] | Book,
  arg2?: Book,
  arg3?: string[]
): CartActionResult {
  let currentCart: CartItem[];
  let book: Book;
  let purchasedIds: string[] | undefined;

  if (Array.isArray(arg1)) {
    currentCart = arg1;
    book = arg2!;
    purchasedIds = arg3;
  } else {
    currentCart = getCartFromLocal();
    book = arg1;
    purchasedIds = typeof arg2 === 'object' && Array.isArray(arg2) ? arg2 : undefined;
  }

  const ownedIds = purchasedIds || getPurchasedBookIdsFromLocal();

  // 1. Check if user already owns this digital eBook
  if (ownedIds.includes(book.id)) {
    return {
      cart: currentCart,
      updatedCart: currentCart,
      isNewItem: false,
      status: 'already_owned',
      message: `You already own "${book.title.slice(0, 22)}...". Available in your Library.`,
    };
  }

  // 2. Check if already in cart
  const exists = currentCart.some((item) => item.book.id === book.id);
  if (exists) {
    return {
      cart: currentCart,
      updatedCart: currentCart,
      isNewItem: false,
      status: 'already_in_cart',
      message: `"${book.title.slice(0, 22)}..." is already in your Cart.`,
    };
  }

  // 3. Add to cart with quantity = 1
  const updatedCart: CartItem[] = [...currentCart, { book, quantity: 1 }];
  saveCartToLocal(updatedCart);

  return {
    cart: updatedCart,
    updatedCart,
    isNewItem: true,
    status: 'added',
    message: `Added "${book.title.slice(0, 22)}..." to Cart`,
  };
}

/**
 * Toggle cart item (Add if absent, Remove if present)
 */
export function toggleCartAction(
  currentCart: CartItem[],
  book: Book,
  purchasedIds?: string[]
): CartActionResult {
  const ownedIds = purchasedIds || getPurchasedBookIdsFromLocal();

  if (ownedIds.includes(book.id)) {
    return {
      cart: currentCart,
      updatedCart: currentCart,
      isNewItem: false,
      status: 'already_owned',
      message: `You already own "${book.title.slice(0, 22)}...". Available in your Library.`,
    };
  }

  const exists = currentCart.some((item) => item.book.id === book.id);
  if (exists) {
    const updatedCart = currentCart.filter((item) => item.book.id !== book.id);
    saveCartToLocal(updatedCart);
    return {
      cart: updatedCart,
      updatedCart,
      isNewItem: false,
      status: 'removed',
      message: `Removed "${book.title.slice(0, 22)}..." from Cart`,
    };
  }

  const updatedCart = [...currentCart, { book, quantity: 1 }];
  saveCartToLocal(updatedCart);
  return {
    cart: updatedCart,
    updatedCart,
    isNewItem: true,
    status: 'added',
    message: `Added "${book.title.slice(0, 22)}..." to Cart`,
  };
}

/**
 * Remove an item from cart
 */
export function removeFromCartAction(
  arg1: CartItem[] | string,
  arg2?: string
): CartItem[] {
  let currentCart: CartItem[];
  let bookId: string;

  if (Array.isArray(arg1)) {
    currentCart = arg1;
    bookId = arg2!;
  } else {
    currentCart = getCartFromLocal();
    bookId = arg1;
  }

  const updated = currentCart.filter((item) => item.book.id !== bookId);
  saveCartToLocal(updated);
  return updated;
}

/**
 * Clear entire cart
 */
export function clearCartAction(): CartItem[] {
  saveCartToLocal([]);
  return [];
}

/**
 * Calculate totals for cart items
 */
export function calculateCartSummary(items: CartItem[]) {
  const subtotal = items.reduce(
    (sum, item) => sum + (item.book.buy_price || 0),
    0
  );
  const totalListPrice = items.reduce(
    (sum, item) =>
      sum + (item.book.list_price || item.book.buy_price || 0),
    0
  );
  const savings = Math.max(0, totalListPrice - subtotal);
  const savingsPercent =
    totalListPrice > 0 ? Math.round((savings / totalListPrice) * 100) : 0;

  return {
    subtotal,
    totalListPrice,
    savings,
    savingsPercent,
    count: items.length,
  };
}

/**
 * Subscribes to real-time cart changes across the window and other browser tabs
 */
export function subscribeToCartChanges(
  callback: (newCart: CartItem[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomSync = (e: Event) => {
    const customEvent = e as CustomEvent<CartItem[]>;
    if (customEvent.detail && Array.isArray(customEvent.detail)) {
      callback(customEvent.detail);
    } else {
      callback(getCartFromLocal());
    }
  };

  const handleStorageSync = (e: StorageEvent) => {
    if (e.key === CART_STORAGE_KEY) {
      callback(getCartFromLocal());
    }
  };

  window.addEventListener(CART_SYNC_EVENT, handleCustomSync);
  window.addEventListener('storage', handleStorageSync);

  return () => {
    window.removeEventListener(CART_SYNC_EVENT, handleCustomSync);
    window.removeEventListener('storage', handleStorageSync);
  };
}
