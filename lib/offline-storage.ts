'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BooksCircleDB extends DBSchema {
  purchases: {
    key: string;
    value: {
      bookId: string;
      purchasedAt: string;
      title: string;
    };
  };
  offlinePdfs: {
    key: string;
    value: {
      bookId: string;
      data: ArrayBuffer;
      updatedAt: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BooksCircleDB>> | null = null;

function getDb(): Promise<IDBPDatabase<BooksCircleDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BooksCircleDB>('bookscircle-storage', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('purchases')) {
          db.createObjectStore('purchases', { keyPath: 'bookId' });
        }
        if (!db.objectStoreNames.contains('offlinePdfs')) {
          db.createObjectStore('offlinePdfs', { keyPath: 'bookId' });
        }
      },
    });
  }
  return dbPromise;
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
  } catch (e) {
    console.warn('Failed to save purchased books to DB:', e);
    // Fallback to localStorage
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

export async function getPdfOffline(bookId: string): Promise<ArrayBuffer | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await getDb();
    const item = await db.get('offlinePdfs', bookId);
    return item ? item.data : null;
  } catch (e) {
    console.warn('Failed to get offline PDF:', e);
    return null;
  }
}

export async function savePdfOffline(bookId: string, data: ArrayBuffer): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDb();
    await db.put('offlinePdfs', {
      bookId,
      data,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Failed to store offline PDF:', e);
  }
}
