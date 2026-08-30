import { Book } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const LOCAL_STORAGE_WISHLIST_KEY = 'bookscircle_wishlist_ids';
const LOCAL_STORAGE_WISHLIST_BOOKS_KEY = 'bookscircle_wishlist_books_cache';
const WISHLIST_CHANGE_EVENT = 'bookscircle_wishlist_updated';

// Get wishlist IDs from local storage
export function getWishlistIdsFromLocal(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Save wishlist IDs to local storage
export function saveWishlistIdsToLocal(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const unique = Array.from(new Set(ids));
    localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, JSON.stringify(unique));
    window.dispatchEvent(
      new CustomEvent(WISHLIST_CHANGE_EVENT, { detail: { ids: unique } })
    );
  } catch (e) {
    console.warn('Wishlist local save note:', e);
  }
}

// Cache full book objects for instant offline/profile wishlist rendering
export function getWishlistBooksFromLocal(): Book[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WISHLIST_BOOKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWishlistBooksToLocal(books: Book[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_WISHLIST_BOOKS_KEY, JSON.stringify(books));
  } catch (e) {
    console.warn('Wishlist books cache note:', e);
  }
}

// Toggle a book in the wishlist
export function toggleWishlistAction(book: Book): {
  isWishlisted: boolean;
  wishlistIds: string[];
} {
  const currentIds = getWishlistIdsFromLocal();
  const currentBooks = getWishlistBooksFromLocal();
  const exists = currentIds.includes(book.id);

  let updatedIds: string[];
  let updatedBooks: Book[];

  if (exists) {
    updatedIds = currentIds.filter((id) => id !== book.id);
    updatedBooks = currentBooks.filter((b) => b.id !== book.id);
  } else {
    updatedIds = [book.id, ...currentIds.filter((id) => id !== book.id)];
    updatedBooks = [book, ...currentBooks.filter((b) => b.id !== book.id)];
  }

  saveWishlistIdsToLocal(updatedIds);
  saveWishlistBooksToLocal(updatedBooks);

  return {
    isWishlisted: !exists,
    wishlistIds: updatedIds,
  };
}

// Remove from wishlist
export function removeFromWishlistAction(bookId: string): string[] {
  const currentIds = getWishlistIdsFromLocal();
  const currentBooks = getWishlistBooksFromLocal();
  const updatedIds = currentIds.filter((id) => id !== bookId);
  const updatedBooks = currentBooks.filter((b) => b.id !== bookId);

  saveWishlistIdsToLocal(updatedIds);
  saveWishlistBooksToLocal(updatedBooks);

  return updatedIds;
}

// Subscribe to wishlist updates across components and tabs
export function subscribeToWishlistChanges(
  callback: (wishlistIds: string[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ ids: string[] }>;
    if (customEvent.detail && Array.isArray(customEvent.detail.ids)) {
      callback(customEvent.detail.ids);
    } else {
      callback(getWishlistIdsFromLocal());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_WISHLIST_KEY) {
      callback(getWishlistIdsFromLocal());
    }
  };

  window.addEventListener(WISHLIST_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(WISHLIST_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// Synchronize wishlist with Firestore user record
export async function syncUserWishlistToFirestore(
  userId: string,
  localIds: string[]
): Promise<string[]> {
  if (!userId || userId === 'guest_user') return localIds;

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);

    let remoteIds: string[] = [];
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.wishlist)) {
        remoteIds = data.wishlist;
      }
    }

    const merged = Array.from(new Set([...localIds, ...remoteIds]));
    saveWishlistIdsToLocal(merged);

    await setDoc(
      userDocRef,
      {
        wishlist: merged,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return merged;
  } catch (err) {
    console.warn('Sync wishlist note:', err);
    return localIds;
  }
}
