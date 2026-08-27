'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Book } from './types';

const OFFLINE_CACHE_NAME = 'bookscircle-offline-pdfs-v2';

interface BooksCircleDB extends DBSchema {
  purchases: {
    key: string;
    value: {
      bookId: string;
      purchasedAt: string;
      title: string;
    };
  };
  pendingPurchases: {
    key: string;
    value: {
      id: string;
      userId: string;
      userEmail: string;
      paymentId: string;
      orderId: string;
      amount: number;
      bookIds: string[];
      items: any[];
      createdAt: string;
    };
  };
  offlinePdfs: {
    key: string;
    value: {
      bookId: string;
      data: ArrayBuffer;
      updatedAt: string;
      sizeBytes?: number;
    };
  };
  offlineBooks: {
    key: string;
    value: {
      bookId: string;
      book: Book;
      savedAt: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BooksCircleDB>> | null = null;

function getDb(): Promise<IDBPDatabase<BooksCircleDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BooksCircleDB>('bookscircle-storage', 3, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('purchases')) {
          db.createObjectStore('purchases', { keyPath: 'bookId' });
        }
        if (!db.objectStoreNames.contains('pendingPurchases')) {
          db.createObjectStore('pendingPurchases', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offlinePdfs')) {
          db.createObjectStore('offlinePdfs', { keyPath: 'bookId' });
        }
        if (!db.objectStoreNames.contains('offlineBooks')) {
          db.createObjectStore('offlineBooks', { keyPath: 'bookId' });
        }
      },
      blocked() {
        console.warn('Database upgrade blocked - closing previous DB');
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then(db => db.close()).catch(() => {});
          dbPromise = null;
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Request persistent browser storage to prevent eviction when PWA is installed, removed, or backgrounded
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }
  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) return true;
    const granted = await navigator.storage.persist();
    return granted;
  } catch (e) {
    console.warn('Storage persist request failed:', e);
    return false;
  }
}

export async function savePurchasedBookIds(bookIds: string[]): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDb();
    const tx = db.transaction('purchases', 'readwrite');
    for (const id of bookIds) {
      await tx.store.put({
        bookId: id,
        purchasedAt: new Date().toISOString(),
        title: id,
      });
    }
    await tx.done;

    // Also sync to localStorage for instantaneous synchronous lookups
    const existing = getPurchasedBookIdsFromLocal();
    const combined = Array.from(new Set([...existing, ...bookIds]));
    localStorage.setItem('bookscircle_purchased_books', JSON.stringify(combined));
    requestPersistentStorage().catch(() => {});
  } catch (e) {
    console.warn('Failed to save purchased books to DB:', e);
    try {
      const existing = getPurchasedBookIdsFromLocal();
      const combined = Array.from(new Set([...existing, ...bookIds]));
      localStorage.setItem('bookscircle_purchased_books', JSON.stringify(combined));
    } catch {}
  }
}

export function getPurchasedBookIdsFromLocal(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('bookscircle_purchased_books');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to read purchased books from localStorage:', e);
  }
  return [];
}

/**
 * Dual-tier retrieval: checks IndexedDB first, then Cache Storage API
 */
export async function getPdfOffline(bookId: string): Promise<ArrayBuffer | null> {
  if (typeof window === 'undefined') return null;

  // 1. Try IndexedDB
  try {
    const db = await getDb();
    const item = await db.get('offlinePdfs', bookId);
    if (item && item.data && item.data.byteLength > 0) {
      return item.data;
    }
  } catch (e) {
    console.warn('IndexedDB read failed, attempting Cache Storage fallback:', e);
  }

  // 2. Try Cache Storage API fallback
  try {
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const cachedResponse = await cache.match(`/offline-pdf/${encodeURIComponent(bookId)}`);
      if (cachedResponse && cachedResponse.ok) {
        const buffer = await cachedResponse.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          // Re-populate IndexedDB in the background for future instant access
          try {
            const db = await getDb();
            await db.put('offlinePdfs', {
              bookId,
              data: buffer,
              updatedAt: new Date().toISOString(),
              sizeBytes: buffer.byteLength,
            });
          } catch {}
          return buffer;
        }
      }
    }
  } catch (cacheErr) {
    console.warn('Cache Storage fallback failed:', cacheErr);
  }

  return null;
}

/**
 * Check if offline PDF is available in either IndexedDB or CacheStorage
 */
export async function isPdfOfflineAvailable(bookId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const db = await getDb();
    const item = await db.get('offlinePdfs', bookId);
    if (item && item.data) return true;
  } catch {}

  try {
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const match = await cache.match(`/offline-pdf/${encodeURIComponent(bookId)}`);
      if (match) return true;
    }
  } catch {}

  return false;
}

export async function getAllOfflineBookIds(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  const idSet = new Set<string>();
  try {
    const db = await getDb();
    const keys = await db.getAllKeys('offlinePdfs');
    keys.forEach((k) => idSet.add(String(k)));
  } catch (e) {
    console.warn('Failed to get offline book keys from IndexedDB:', e);
  }

  try {
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const requests = await cache.keys();
      requests.forEach((req) => {
        const match = req.url.match(/\/offline-pdf\/(.+)$/);
        if (match && match[1]) {
          idSet.add(decodeURIComponent(match[1]));
        }
      });
    }
  } catch {}

  return Array.from(idSet);
}

/**
 * Saves PDF in both IndexedDB and CacheStorage with persistent lock
 */
export async function savePdfOffline(bookId: string, data: ArrayBuffer, book?: Book): Promise<void> {
  if (typeof window === 'undefined') return;

  // Lock persistent storage
  requestPersistentStorage().catch(() => {});

  // 1. Store in IndexedDB
  try {
    const db = await getDb();
    await db.put('offlinePdfs', {
      bookId,
      data,
      updatedAt: new Date().toISOString(),
      sizeBytes: data.byteLength,
    });

    if (book) {
      await db.put('offlineBooks', {
        bookId,
        book,
        savedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Failed to store offline PDF in IndexedDB:', e);
  }

  // 2. Store in Cache Storage API (dual persistence across PWA installs)
  try {
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const response = new Response(data, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(data.byteLength),
          'X-Book-Id': bookId,
        },
      });
      await cache.put(`/offline-pdf/${encodeURIComponent(bookId)}`, response);
    }
  } catch (cacheErr) {
    console.warn('Failed to cache PDF in Cache Storage:', cacheErr);
  }

  // 3. Keep book metadata in local storage backup
  if (book) {
    try {
      const existing = getOfflineBooksFromLocal();
      const filtered = existing.filter((b) => b.id !== book.id);
      filtered.push(book);
      localStorage.setItem('bookscircle_offline_books_meta', JSON.stringify(filtered));
    } catch {}
  }
}

/**
 * Retrieve all offline book metadata
 */
export async function getAllOfflineBooks(): Promise<Book[]> {
  if (typeof window === 'undefined') return [];
  const books: Book[] = [];
  try {
    const db = await getDb();
    const records = await db.getAll('offlineBooks');
    records.forEach((r) => {
      if (r.book) books.push(r.book);
    });
  } catch (e) {
    console.warn('Failed to read offline books from IndexedDB:', e);
  }

  // Merge with localStorage backup
  const localBooks = getOfflineBooksFromLocal();
  const map = new Map<string, Book>();
  books.forEach((b) => map.set(b.id, b));
  localBooks.forEach((b) => {
    if (!map.has(b.id)) map.set(b.id, b);
  });

  return Array.from(map.values());
}

export function getOfflineBooksFromLocal(): Book[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('bookscircle_offline_books_meta');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function deleteOfflinePdf(bookId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDb();
    await db.delete('offlinePdfs', bookId);
    await db.delete('offlineBooks', bookId);
  } catch (e) {
    console.warn('Failed to delete offline PDF from IndexedDB:', e);
  }

  try {
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      await cache.delete(`/offline-pdf/${encodeURIComponent(bookId)}`);
    }
  } catch {}

  try {
    const existing = getOfflineBooksFromLocal();
    const filtered = existing.filter((b) => b.id !== bookId);
    localStorage.setItem('bookscircle_offline_books_meta', JSON.stringify(filtered));
  } catch {}
}

export async function getOfflineStorageStats(): Promise<{ count: number; totalBytes: number; isPersisted: boolean }> {
  if (typeof window === 'undefined') return { count: 0, totalBytes: 0, isPersisted: false };
  let isPersisted = false;
  try {
    if (navigator.storage && navigator.storage.persisted) {
      isPersisted = await navigator.storage.persisted();
    }
  } catch {}

  try {
    const db = await getDb();
    const allPdfs = await db.getAll('offlinePdfs');
    let totalBytes = 0;
    allPdfs.forEach((item) => {
      if (item.data) {
        totalBytes += item.data.byteLength;
      }
    });
    return {
      count: allPdfs.length,
      totalBytes,
      isPersisted,
    };
  } catch (e) {
    console.warn('Failed to get offline stats:', e);
    return { count: 0, totalBytes: 0, isPersisted };
  }
}

export async function clearAllOfflinePdfs(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDb();
    await db.clear('offlinePdfs');
    await db.clear('offlineBooks');
  } catch (e) {
    console.warn('Failed to clear offline storage:', e);
  }

  try {
    if ('caches' in window) {
      await caches.delete(OFFLINE_CACHE_NAME);
    }
  } catch {}

  try {
    localStorage.removeItem('bookscircle_offline_books_meta');
  } catch {}
}

export async function queuePendingPurchase(data: {
  userId: string;
  userEmail: string;
  paymentId: string;
  orderId: string;
  amount: number;
  bookIds: string[];
  items: any[];
}): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDb();
    await db.put('pendingPurchases', {
      id: data.paymentId || `pending_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Failed to queue pending purchase in offline storage:', e);
  }
}

export async function getPendingPurchases(): Promise<any[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await getDb();
    return await db.getAll('pendingPurchases');
  } catch (e) {
    console.warn('Failed to retrieve pending purchases:', e);
    return [];
  }
}

export async function removePendingPurchase(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDb();
    await db.delete('pendingPurchases', id);
  } catch (e) {
    console.warn('Failed to delete pending purchase:', e);
  }
}

