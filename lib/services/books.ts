import {
  collection,
  getDocs,
  getDoc,
  onSnapshot,
  doc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Book, Category } from '../types';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '../data';
import {
  resolveBookCoverUrl,
  resolveBookSampleUrl,
  resolveBookPdfUrl,
  resolveBookMdSampleUrl,
  resolveBookMdUrl,
} from './storage';

const LOCAL_STORAGE_BOOKS_KEY = 'bookscircle_live_books_cache';
const LOCAL_STORAGE_CATEGORIES_KEY = 'bookscircle_live_categories_cache';
const FIREBASE_API_KEY = "AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk";
const PROJECT_ID = "bookscircle-d579d";
const FIRESTORE_DATABASE_ID = "bookscircle";

// Helper to purge legacy demo cache
export function purgeLegacyDemoCache() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('bookscircle_local_books');
      localStorage.removeItem('bookscircle_local_categories');
    } catch {}
  }
}

// Synchronous fast getter for immediate 0ms initial render
export function getCachedBooksSync(): Book[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_BOOKS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return INITIAL_BOOKS;
}

// Synchronous fast getter for categories
export function getCachedCategoriesSync(): Category[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return INITIAL_CATEGORIES;
}

export function parseBookDocument(docSnap: any): Book {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const bookId = docSnap.id || data.id || '';
  const buyPrice = Number(data.buyprice ?? data.buy_price ?? data.price ?? data.sale_price ?? 0);
  const listPrice = Number(data.listprice ?? data.list_price ?? data.mrp ?? data.original_price ?? (buyPrice > 0 ? Math.round(buyPrice * 1.6) : 300));
  const rating = Number(data.averageRating ?? data.rating ?? data.avg_rating ?? 4.8);
  const ratingCount = Number(data.reviewCount ?? data.rating_count ?? data.ratings_count ?? data.review_count ?? 120);
  const pages = Number(data.pageCount ?? data.pages ?? data.page_count ?? data.num_pages ?? 0);

  const seoDesc = String(data.seoDescription ?? data.seo_description ?? data.short_description ?? data.shortDescription ?? data.subtitle ?? '').trim();
  const fullDesc = String(data.fullDescription ?? data.full_description ?? data.description ?? data.summary ?? data.content ?? '').trim();
  const seoslug = String(data.seoslug ?? data.slug ?? bookId).trim();
  const categorySlug = String(data.categorySlug ?? data.category_slug ?? (data.category ? data.category.toLowerCase().replace(/\s+/g, '-') : '')).trim();

  const rawCover = data.imageUrl || data.cover || data.cover_image || data.image || data.thumbnail || data.image_url || data.coverImage || data.coverUrl || '';
  const resolvedCover = resolveBookCoverUrl(rawCover, bookId);

  const rawSample = data.sampleurl || data.sampleUrl || data.sample_file || data.sample_pdf || data.sample_url || data.sampleFile || data.preview_url || data.sample || '';
  const resolvedSample = resolveBookSampleUrl(rawSample, bookId);

  const rawPdfStoragePath = data.pdfurl || data.pdfUrl || data.pdf_file || data.pdfFile || data.pdf_url || data.pdfStoragePath || data.pdf_storage_path || data.full_pdf_url || data.file_url || data.fileUrl || data.download_url || data.downloadUrl || data.book_file || data.full_file || data.url || data.pdf || '';
  const resolvedFullPdfUrl = resolveBookPdfUrl(rawPdfStoragePath, bookId);

  // Markdown URLs
  const rawMdSample = data.mdsampleurl || data.mdSampleUrl || data.md_sample_url || data.md_sample || data.sample_md || '';
  const resolvedMdSample = resolveBookMdSampleUrl(rawMdSample, bookId);

  const rawMdUrl = data.mdurl || data.mdUrl || data.md_url || data.md_file || data.full_md_url || data.md || '';
  const resolvedMdUrl = resolveBookMdUrl(rawMdUrl, bookId);
  const hasMd = Boolean(rawMdUrl || rawMdSample);

  const publisher = data.publisher || data.publication || 'Mocktime Publication';
  const language = data.language || 'English';
  const bookType = data.type || data.format || data.book_type || data.edition || 'Question Bank';

  return {
    id: bookId,
    title: data.title || data.name || 'Untitled Book',
    slug: bookId,
    seoslug: seoslug,
    seo_description: seoDesc,
    full_description: fullDesc,
    seoDescription: seoDesc,
    fullDescription: fullDesc,
    category: data.category || 'CUET PG',
    categorySlug: categorySlug,
    tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : [data.category || 'Exam Book', language, bookType, 'Question Bank'],
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    buy_price: buyPrice,
    list_price: listPrice,
    pdf_file: resolvedFullPdfUrl,
    pdfUrl: resolvedFullPdfUrl,
    pdf_url: resolvedFullPdfUrl,
    pdfStoragePath: resolvedFullPdfUrl,
    hasFullPdf: data.hasFullPdf !== undefined ? Boolean(data.hasFullPdf) : true,
    md_file: resolvedMdUrl,
    mdurl: resolvedMdUrl,
    mdUrl: resolvedMdUrl,
    md_url: resolvedMdUrl,
    mdsampleurl: resolvedMdSample,
    mdSampleUrl: resolvedMdSample,
    md_sample_url: resolvedMdSample,
    hasMd: hasMd,
    cover: resolvedCover,
    imageUrl: resolvedCover,
    sample_file: resolvedSample,
    sampleUrl: resolvedSample,
    rating: rating > 0 ? rating : 4.8,
    rating_count: ratingCount > 0 ? ratingCount : 120,
    author: data.author || data.authors || publisher,
    publisher: publisher,
    publication: publisher,
    published_date: data.published_date || data.published_year || data.publish_date || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).getFullYear().toString() : '2026'),
    isbn: data.isbn || '',
    pages: pages > 0 ? pages : 280,
    language: language,
    type: bookType,
    file_size: data.fileSizeInMB ? `${data.fileSizeInMB} MB` : (data.file_size || '14.5 MB'),
    sold_count: Number(data.sold_count ?? data.soldCount ?? data.total_sold ?? data.sales ?? data.sales_count ?? 0),
    topics: Array.isArray(data.topics) ? data.topics : (Array.isArray(data.features) ? data.features : []),
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
  };
}

function parseFirestoreRestValue(valObj: any): any {
  if (!valObj) return undefined;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('timestampValue' in valObj) return valObj.timestampValue;
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    return Array.isArray(valObj.arrayValue?.values)
      ? valObj.arrayValue.values.map(parseFirestoreRestValue)
      : [];
  }
  if ('mapValue' in valObj) {
    const res: Record<string, any> = {};
    const fields = valObj.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreRestValue(v);
    }
    return res;
  }
  return valObj;
}

function parseFirestoreRestDocument(docObj: any): { id: string; [key: string]: any } {
  const fields = docObj.fields || {};
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    res[k] = parseFirestoreRestValue(v);
  }
  const parts = (docObj.name || '').split('/');
  res.id = res.id || parts[parts.length - 1] || '';
  return res as { id: string; [key: string]: any };
}

// REST fallback for books
async function fetchBooksFromFirestoreRest(): Promise<Book[] | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/books?pageSize=100&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const text = await res.text();
    if (text.trim().startsWith('<')) return null;
    const json = JSON.parse(text);
    if (json && Array.isArray(json.documents)) {
      return json.documents.map((docObj: any) => {
        const parsed = parseFirestoreRestDocument(docObj);
        return parseBookDocument(parsed);
      });
    }
    return null;
  } catch (err) {
    return null;
  }
}

// REST fallback for categories
async function fetchCategoriesFromFirestoreRest(): Promise<Category[] | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/categories?pageSize=100&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const text = await res.text();
    if (text.trim().startsWith('<')) return null;
    const json = JSON.parse(text);
    if (json && Array.isArray(json.documents)) {
      return json.documents.map((docObj: any) => {
        const data = parseFirestoreRestDocument(docObj);
        const seoCatVal = data.seoCat || data.seocat || data.seo_cat || '';
        return {
          id: data.id,
          title: data.name || data.title || data.id,
          seolsug: data.seoslug || data.slug || data.id,
          seoCat: seoCatVal,
          seo_description: seoCatVal,
        };
      });
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Fetch all books with fast race between Firestore SDK, REST API and cache
export async function getBooksFromFirestore(): Promise<Book[]> {
  purgeLegacyDemoCache();
  const fallback = getCachedBooksSync();

  const sdkFetch = (async (): Promise<Book[] | null> => {
    try {
      const booksCol = collection(db, 'books');
      const snapshot = await getDocs(booksCol);
      if (!snapshot.empty) {
        const books: Book[] = [];
        snapshot.forEach((docSnap) => {
          books.push(parseBookDocument(docSnap));
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(books));
          } catch {}
        }
        return books;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 2500)
  );

  let result = await Promise.race([sdkFetch, timeoutPromise]);
  if (!result || result.length === 0) {
    // Attempt rapid REST fallback
    const restBooks = await fetchBooksFromFirestoreRest();
    if (restBooks && restBooks.length > 0) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(restBooks));
        } catch {}
      }
      return restBooks;
    }
  }

  if (result && result.length > 0) {
    return result;
  }

  return fallback;
}

// Real-time listener for continuous updates from Firestore
export function subscribeToFirestoreBooks(onUpdate: (books: Book[]) => void): () => void {
  try {
    const booksCol = collection(db, 'books');
    const unsubscribe = onSnapshot(
      booksCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const books: Book[] = [];
          snapshot.forEach((docSnap) => {
            books.push(parseBookDocument(docSnap));
          });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(books));
            } catch {}
          }
          onUpdate(books);
        }
      },
      (error) => {
        console.warn('Firestore real-time books listener status:', error?.message || String(error));
      }
    );
    return unsubscribe;
  } catch (err) {
    return () => {};
  }
}

// Real-time listener for a single book by ID
export function subscribeToFirestoreBook(bookId: string, onUpdate: (book: Book | null) => void): () => void {
  try {
    const docRef = doc(db, 'books', bookId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(parseBookDocument(snap));
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn(`Firestore single book listener status for ${bookId}:`, error?.message || String(error));
      }
    );
    return unsubscribe;
  } catch (err) {
    return () => {};
  }
}

// Fetch all categories with fast timeout and REST fallback
export async function getCategoriesFromFirestore(): Promise<Category[]> {
  purgeLegacyDemoCache();
  const fallback = getCachedCategoriesSync();

  const sdkFetch = (async (): Promise<Category[] | null> => {
    try {
      const catCol = collection(db, 'categories');
      const snapshot = await getDocs(catCol);
      if (!snapshot.empty) {
        const categories: Category[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const seoCatVal = data.seoCat || data.seocat || data.seo_cat || '';
          categories.push({
            id: docSnap.id,
            title: data.name || data.title || docSnap.id,
            seolsug: data.seoslug || data.slug || docSnap.id,
            seoCat: seoCatVal,
            seo_description: seoCatVal,
          });
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
          } catch {}
        }
        return categories;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 2500)
  );

  let result = await Promise.race([sdkFetch, timeoutPromise]);
  if (!result || result.length === 0) {
    const restCats = await fetchCategoriesFromFirestoreRest();
    if (restCats && restCats.length > 0) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(restCats));
        } catch {}
      }
      return restCats;
    }
  }

  if (result && result.length > 0) {
    return result;
  }

  return fallback;
}

// Real-time listener for categories
export function subscribeToFirestoreCategories(onUpdate: (categories: Category[]) => void): () => void {
  try {
    const catCol = collection(db, 'categories');
    const unsubscribe = onSnapshot(
      catCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const categories: Category[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const seoCatVal = data.seoCat || data.seocat || data.seo_cat || '';
            categories.push({
              id: docSnap.id,
              title: data.name || data.title || docSnap.id,
              seolsug: data.seoslug || data.slug || docSnap.id,
              seoCat: seoCatVal,
              seo_description: seoCatVal,
            });
          });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
            } catch {}
          }
          onUpdate(categories);
        }
      },
      (error) => {
        console.warn('Firestore real-time categories listener status:', error?.message || String(error));
      }
    );
    return unsubscribe;
  } catch (err) {
    return () => {};
  }
}

// Fetch a single book by ID or Slug from Firestore with accurate single-doc lookup
export async function getFirestoreBookById(idOrSlug: string): Promise<Book | null> {
  if (!idOrSlug) return null;
  const rawTarget = idOrSlug.trim();
  const target = rawTarget.toLowerCase();

  // 1. Direct single-document Firestore read
  try {
    const docRef = doc(db, 'books', rawTarget);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return parseBookDocument(snap);
    }
  } catch {}

  // 2. Direct Firestore query by clean seoslug
  try {
    const seoslugQuery = query(
      collection(db, 'books'),
      where('seoslug', '==', target),
      limit(1)
    );
    const slugSnap = await getDocs(seoslugQuery);
    if (!slugSnap.empty) {
      return parseBookDocument(slugSnap.docs[0]);
    }
  } catch {}

  // 3. Direct REST single doc read fallback
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/books/${encodeURIComponent(rawTarget)}?key=${FIREBASE_API_KEY}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const text = await res.text();
        if (!text.trim().startsWith('<')) {
          const json = JSON.parse(text);
          const parsed = parseFirestoreRestDocument(json);
          if (parsed) {
            return parseBookDocument(parsed);
          }
        }
      }
    }
  } catch {}

  // 4. Search in full book list
  const books = await getBooksFromFirestore();

  // Priority 1: Exact ID match
  const exactIdMatch = books.find((b) => b.id.toLowerCase() === target);
  if (exactIdMatch) return exactIdMatch;

  // Priority 2: ID suffix / sub-match
  const suffixMatch = books.find((b) => b.id.toLowerCase().endsWith(target) || target.endsWith(b.id.toLowerCase()));
  if (suffixMatch) return suffixMatch;

  // Priority 3: seoslug or slug match
  const slugMatch = books.find(
    (b) =>
      (b.seoslug && b.seoslug.toLowerCase() === target) ||
      (b.slug && b.slug.toLowerCase() === target)
  );
  if (slugMatch) return slugMatch;

  // Priority 4: Title match
  const titleMatch = books.find((b) => b.title.toLowerCase() === target);
  if (titleMatch) return titleMatch;

  // 5. Fallback to cached sync data
  const fallbackList = getCachedBooksSync();
  const fallbackMatch = fallbackList.find(
    (b) =>
      b.id.toLowerCase() === target ||
      (b.seoslug && b.seoslug.toLowerCase() === target) ||
      (b.slug && b.slug.toLowerCase() === target) ||
      b.title.toLowerCase() === target
  );
  return fallbackMatch || null;
}

export const LOCAL_STORAGE_SOLD_COUNTS_KEY = 'bookscircle_sold_counts_cache';

// Helper to normalize slug/ID for robust matching against order/purchase records
function normalizeSlugKey(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/-bk\d+$/i, '')
    .replace(/-[a-f0-9]{6}$/i, '')
    .replace(/-plus-/g, '-')
    .replace(/-and-/g, '-')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Synchronous getter for cached book sales count map (0ms instant render)
 */
export function getCachedSoldCountsSync(): Record<string, number> {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SOLD_COUNTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}
  }
  return {};
}

/**
 * Real-time listener and aggregator for actual sold book items.
 * Strictly computes sales numbers from verified purchases (/purchases, /orders, and /book_analytics)
 * in Firestore, mapping IDs, slugs, and document keys to the authoritative book.id.
 */
export function subscribeToSoldBookCounts(
  onSoldCountsUpdated: (counts: Record<string, number>) => void
): () => void {
  const unsubscribers: (() => void)[] = [];
  let currentPurchases: any[] = [];
  let currentOrders: any[] = [];
  let currentAnalytics: any[] = [];

  const recalculateAndNotify = () => {
    const books = getCachedBooksSync();
    const countMap: Record<string, number> = {};

    const recordSale = (rawKey: string, count = 1) => {
      if (!rawKey) return;
      const k = String(rawKey).trim();
      const normK = normalizeSlugKey(k);

      // Find matching book in catalog
      const matched = books.find(
        (b) =>
          b.id === k ||
          b.id.toLowerCase() === k.toLowerCase() ||
          (b.seoslug && b.seoslug.toLowerCase() === k.toLowerCase()) ||
          (b.slug && b.slug.toLowerCase() === k.toLowerCase()) ||
          (normK.length > 8 && normalizeSlugKey(b.seoslug || '') === normK) ||
          (normK.length > 8 && normalizeSlugKey(b.slug || '') === normK)
      );

      const targetBookId = matched ? matched.id : k;
      countMap[targetBookId] = (countMap[targetBookId] || 0) + count;
    };

    // 1. Purchases collection (each verified completed payment)
    currentPurchases.forEach((p) => {
      if (Array.isArray(p.bookIds)) {
        p.bookIds.forEach((id: string) => recordSale(id, 1));
      }
    });

    // 2. Orders collection (avoiding duplicate count if order was already recorded in purchases)
    const purchaseOrderIds = new Set(currentPurchases.map((p) => p.orderId).filter(Boolean));
    currentOrders.forEach((o) => {
      if (!purchaseOrderIds.has(o.orderId) && !purchaseOrderIds.has(o.id)) {
        if (Array.isArray(o.bookIds)) {
          o.bookIds.forEach((id: string) => recordSale(id, 1));
        }
      }
    });

    // 3. Book analytics collection (incorporate higher verified totals if present)
    currentAnalytics.forEach((a) => {
      if (a.bookId && typeof a.totalPurchases === 'number' && a.totalPurchases > (countMap[a.bookId] || 0)) {
        countMap[a.bookId] = a.totalPurchases;
      }
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_SOLD_COUNTS_KEY, JSON.stringify(countMap));
      } catch {}
    }

    onSoldCountsUpdated(countMap);
  };

  try {
    // 1. Subscribe to /purchases
    const purchasesCol = collection(db, 'purchases');
    const unsubPurchases = onSnapshot(
      purchasesCol,
      (snap) => {
        currentPurchases = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        recalculateAndNotify();
      },
      (err) => console.warn('Purchases sold listener warning:', err?.message)
    );
    unsubscribers.push(unsubPurchases);

    // 2. Subscribe to /orders
    const ordersCol = collection(db, 'orders');
    const unsubOrders = onSnapshot(
      ordersCol,
      (snap) => {
        currentOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        recalculateAndNotify();
      },
      (err) => console.warn('Orders sold listener warning:', err?.message)
    );
    unsubscribers.push(unsubOrders);

    // 3. Subscribe to /book_analytics
    const analyticsCol = collection(db, 'book_analytics');
    const unsubAnalytics = onSnapshot(
      analyticsCol,
      (snap) => {
        currentAnalytics = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        recalculateAndNotify();
      },
      (err) => console.warn('Book analytics sold listener warning:', err?.message)
    );
    unsubscribers.push(unsubAnalytics);
  } catch (err) {
    console.warn('Realtime sales listeners error:', err);
  }

  return () => {
    unsubscribers.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}
