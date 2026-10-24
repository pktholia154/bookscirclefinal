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

function resolveIsoTimestamp(val: any): string | undefined {
  if (!val) return undefined;
  try {
    if (typeof val === 'object') {
      if (typeof val.seconds === 'number') {
        return new Date(val.seconds * 1000).toISOString();
      }
      if (typeof val._seconds === 'number') {
        return new Date(val._seconds * 1000).toISOString();
      }
      if (typeof val.toDate === 'function') {
        return val.toDate().toISOString();
      }
    }
    if (typeof val === 'number' && val > 946684800000) {
      return new Date(val).toISOString();
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      if (/^\d{4}$/.test(trimmed)) {
        return `${trimmed}-01-01T00:00:00.000Z`;
      }
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  } catch {}
  return undefined;
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

  const createdAtIso =
    resolveIsoTimestamp(data.createdAt ?? data.created_at ?? data._createTime) ||
    resolveIsoTimestamp(data.published_date ?? data.publish_date);
  const updatedAtIso =
    resolveIsoTimestamp(data.updatedAt ?? data.updated_at ?? data._updateTime) ||
    createdAtIso;

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
    created_at: createdAtIso,
    updated_at: updatedAtIso,
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
  if (docObj.createTime) res._createTime = docObj.createTime;
  if (docObj.updateTime) res._updateTime = docObj.updateTime;
  return res as { id: string; [key: string]: any };
}

// Server-side & Client-side in-memory caches for 0ms instant navigation & SSR response
let serverBooksCache: Book[] | null = null;
let serverBooksCacheExpiresAt = 0;
const SERVER_BOOKS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

let serverCategoriesCache: Category[] | null = null;
let serverCategoriesCacheExpiresAt = 0;

let clientBooksMemoryCache: Book[] | null = null;
let clientBooksCacheExpiresAt = 0;
const CLIENT_BOOKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let clientCategoriesMemoryCache: Category[] | null = null;
let clientCategoriesCacheExpiresAt = 0;

let inflightBooksPromise: Promise<Book[] | null> | null = null;
let inflightCategoriesPromise: Promise<Category[] | null> | null = null;

/**
 * Creates a lightweight version of a Book object for catalog grids, carousels, and SSR props.
 * Strips multi-kilobyte markdown full_description and embedded reviews arrays so Next.js RSC
 * payloads remain ~25KB instead of 6MB+, preventing Cloud Run 503 timeouts and making route transitions instant.
 */
export function slimBookForList(book: Book): Book {
  if (!book) return book;
  const shortSeo = (book.seo_description || book.seoDescription || '').slice(0, 220);
  return {
    ...book,
    seo_description: shortSeo,
    seoDescription: shortSeo,
    full_description: '',
    fullDescription: '',
    reviews: [],
    topics: Array.isArray(book.topics) ? book.topics.slice(0, 4) : [],
    tags: Array.isArray(book.tags) ? book.tags.slice(0, 6) : [],
  };
}

/**
 * Prepares a compact, high-priority list of books for initial SSR hydration.
 */
export function slimBooksForSSR(books: Book[], maxCount = 96): Book[] {
  if (!Array.isArray(books) || books.length === 0) return INITIAL_BOOKS.map(slimBookForList);
  const active = books.filter((b) => b && b.isActive !== false);
  const source = active.length > 0 ? active : books;
  return source.slice(0, maxCount).map(slimBookForList);
}

// Safely persist slimmed catalog to localStorage without exceeding 5MB browser quota
function saveBooksToLocalStorageSafe(books: Book[]) {
  if (typeof window === 'undefined' || !Array.isArray(books) || books.length === 0) return;
  try {
    const slimmed = books.map(slimBookForList);
    localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(slimmed));
  } catch {
    try {
      const topSlimmed = books.slice(0, 250).map(slimBookForList);
      localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(topSlimmed));
    } catch {}
  }
}

// REST query for books fetching catalog with projection to keep payload compact and fast
async function fetchBooksFromFirestoreRest(): Promise<Book[] | null> {
  if (inflightBooksPromise) {
    return inflightBooksPromise;
  }

  inflightBooksPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents:runQuery?key=${FIREBASE_API_KEY}`;
      // Use select projection to omit heavy full_description and reviews arrays,
      // shrinking Firestore REST payload from ~18.5MB down to ~300KB and resolving in <200ms
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: 'books' }],
          select: {
            fields: [
              { fieldPath: 'id' },
              { fieldPath: 'title' },
              { fieldPath: 'name' },
              { fieldPath: 'slug' },
              { fieldPath: 'seoslug' },
              { fieldPath: 'category' },
              { fieldPath: 'categorySlug' },
              { fieldPath: 'category_slug' },
              { fieldPath: 'seoDescription' },
              { fieldPath: 'seo_description' },
              { fieldPath: 'short_description' },
              { fieldPath: 'shortDescription' },
              { fieldPath: 'subtitle' },
              { fieldPath: 'buyprice' },
              { fieldPath: 'buy_price' },
              { fieldPath: 'price' },
              { fieldPath: 'sale_price' },
              { fieldPath: 'listprice' },
              { fieldPath: 'list_price' },
              { fieldPath: 'mrp' },
              { fieldPath: 'original_price' },
              { fieldPath: 'imageUrl' },
              { fieldPath: 'cover' },
              { fieldPath: 'cover_image' },
              { fieldPath: 'image' },
              { fieldPath: 'thumbnail' },
              { fieldPath: 'sampleurl' },
              { fieldPath: 'sampleUrl' },
              { fieldPath: 'sample_file' },
              { fieldPath: 'sample_pdf' },
              { fieldPath: 'pdfurl' },
              { fieldPath: 'pdfUrl' },
              { fieldPath: 'pdf_file' },
              { fieldPath: 'pdf_storage_path' },
              { fieldPath: 'pdfStoragePath' },
              { fieldPath: 'mdurl' },
              { fieldPath: 'mdUrl' },
              { fieldPath: 'md_file' },
              { fieldPath: 'mdsampleurl' },
              { fieldPath: 'mdSampleUrl' },
              { fieldPath: 'md_sample_url' },
              { fieldPath: 'author' },
              { fieldPath: 'authors' },
              { fieldPath: 'publisher' },
              { fieldPath: 'publication' },
              { fieldPath: 'language' },
              { fieldPath: 'type' },
              { fieldPath: 'format' },
              { fieldPath: 'edition' },
              { fieldPath: 'published_date' },
              { fieldPath: 'publish_date' },
              { fieldPath: 'published_year' },
              { fieldPath: 'createdAt' },
              { fieldPath: 'updatedAt' },
              { fieldPath: 'rating' },
              { fieldPath: 'averageRating' },
              { fieldPath: 'avg_rating' },
              { fieldPath: 'reviewCount' },
              { fieldPath: 'rating_count' },
              { fieldPath: 'ratings_count' },
              { fieldPath: 'pageCount' },
              { fieldPath: 'pages' },
              { fieldPath: 'sold_count' },
              { fieldPath: 'soldCount' },
              { fieldPath: 'tags' },
              { fieldPath: 'topics' },
              { fieldPath: 'features' },
              { fieldPath: 'isActive' },
            ],
          },
          limit: 3500,
        },
      };

      // Explicitly set cache: 'no-store' to bypass Next.js 2MB fetch cache limit
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody),
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data)) {
        const books: Book[] = [];
        for (const item of data) {
          if (item && item.document) {
            const parsed = parseFirestoreRestDocument(item.document);
            books.push(parseBookDocument(parsed));
          }
        }
        return books.length > 0 ? books : null;
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      inflightBooksPromise = null;
    }
  })();

  return inflightBooksPromise;
}

// REST query for categories
async function fetchCategoriesFromFirestoreRest(): Promise<Category[] | null> {
  if (inflightCategoriesPromise) {
    return inflightCategoriesPromise;
  }

  inflightCategoriesPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/categories?pageSize=100&key=${FIREBASE_API_KEY}`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
      });
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
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      inflightCategoriesPromise = null;
    }
  })();

  return inflightCategoriesPromise;
}

// Fetch all books with instant memory cache + stale-while-revalidate + fast REST API
export async function getBooksFromFirestore(): Promise<Book[]> {
  const isServer = typeof window === 'undefined';
  const now = Date.now();

  if (isServer) {
    if (serverBooksCache && serverBooksCache.length > 0) {
      if (now >= serverBooksCacheExpiresAt) {
        // Stale-while-revalidate in background so SSR never blocks
        fetchBooksFromFirestoreRest()
          .then((fresh) => {
            if (fresh && fresh.length > 0) {
              serverBooksCache = fresh;
              serverBooksCacheExpiresAt = Date.now() + SERVER_BOOKS_CACHE_TTL;
            }
          })
          .catch(() => {});
      }
      return serverBooksCache;
    }

    const restBooks = await fetchBooksFromFirestoreRest();
    if (restBooks && restBooks.length > 0) {
      serverBooksCache = restBooks;
      serverBooksCacheExpiresAt = now + SERVER_BOOKS_CACHE_TTL;
      return restBooks;
    }
    return INITIAL_BOOKS;
  }

  // Client side: return in-memory cache immediately if available
  if (clientBooksMemoryCache && clientBooksMemoryCache.length > 0) {
    if (now >= clientBooksCacheExpiresAt) {
      fetchBooksFromFirestoreRest()
        .then((fresh) => {
          if (fresh && fresh.length > 0) {
            clientBooksMemoryCache = fresh;
            clientBooksCacheExpiresAt = Date.now() + CLIENT_BOOKS_CACHE_TTL;
            saveBooksToLocalStorageSafe(fresh);
          }
        })
        .catch(() => {});
    }
    return clientBooksMemoryCache;
  }

  purgeLegacyDemoCache();
  const fallback = getCachedBooksSync();

  const restBooks = await fetchBooksFromFirestoreRest();
  if (restBooks && restBooks.length > 0) {
    clientBooksMemoryCache = restBooks;
    clientBooksCacheExpiresAt = now + CLIENT_BOOKS_CACHE_TTL;
    saveBooksToLocalStorageSafe(restBooks);
    return restBooks;
  }

  return fallback;
}

// Fast catalog sync for components without opening a 3,000-doc WebChannel stream on every route change
export function subscribeToFirestoreBooks(onUpdate: (books: Book[]) => void): () => void {
  let active = true;

  if (clientBooksMemoryCache && clientBooksMemoryCache.length > 0) {
    onUpdate(clientBooksMemoryCache);
  }

  getBooksFromFirestore()
    .then((books) => {
      if (active && books && books.length > 0) {
        onUpdate(books);
      }
    })
    .catch(() => {});

  return () => {
    active = false;
  };
}

// Real-time listener for a single book by ID
export function subscribeToFirestoreBook(bookId: string, onUpdate: (book: Book | null) => void): () => void {
  if (!bookId || typeof window === 'undefined') return () => {};
  try {
    const docRef = doc(db, 'books', bookId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const parsed = parseBookDocument(snap);
          // Also update in-memory cache if present
          if (clientBooksMemoryCache) {
            const idx = clientBooksMemoryCache.findIndex((b) => b.id === parsed.id);
            if (idx >= 0) clientBooksMemoryCache[idx] = parsed;
          }
          onUpdate(parsed);
        }
      },
      (error) => {
        console.warn(`Firestore single book listener status for ${bookId}:`, error?.message || String(error));
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

// Fetch all categories with instant cache + fast REST API
export async function getCategoriesFromFirestore(): Promise<Category[]> {
  const isServer = typeof window === 'undefined';
  const now = Date.now();

  if (isServer) {
    if (serverCategoriesCache && serverCategoriesCache.length > 0) {
      if (now >= serverCategoriesCacheExpiresAt) {
        fetchCategoriesFromFirestoreRest()
          .then((fresh) => {
            if (fresh && fresh.length > 0) {
              serverCategoriesCache = fresh;
              serverCategoriesCacheExpiresAt = Date.now() + SERVER_BOOKS_CACHE_TTL;
            }
          })
          .catch(() => {});
      }
      return serverCategoriesCache;
    }

    const restCats = await fetchCategoriesFromFirestoreRest();
    if (restCats && restCats.length > 0) {
      serverCategoriesCache = restCats;
      serverCategoriesCacheExpiresAt = now + SERVER_BOOKS_CACHE_TTL;
      return restCats;
    }
    return INITIAL_CATEGORIES;
  }

  if (clientCategoriesMemoryCache && clientCategoriesMemoryCache.length > 0) {
    if (now >= clientCategoriesCacheExpiresAt) {
      fetchCategoriesFromFirestoreRest()
        .then((fresh) => {
          if (fresh && fresh.length > 0) {
            clientCategoriesMemoryCache = fresh;
            clientCategoriesCacheExpiresAt = Date.now() + CLIENT_BOOKS_CACHE_TTL;
            try {
              localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(fresh));
            } catch {}
          }
        })
        .catch(() => {});
    }
    return clientCategoriesMemoryCache;
  }

  purgeLegacyDemoCache();
  const fallback = getCachedCategoriesSync();

  const restCats = await fetchCategoriesFromFirestoreRest();
  if (restCats && restCats.length > 0) {
    clientCategoriesMemoryCache = restCats;
    clientCategoriesCacheExpiresAt = now + CLIENT_BOOKS_CACHE_TTL;
    try {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(restCats));
    } catch {}
    return restCats;
  }

  return fallback;
}

// Fast category sync for components
export function subscribeToFirestoreCategories(onUpdate: (categories: Category[]) => void): () => void {
  let active = true;

  if (clientCategoriesMemoryCache && clientCategoriesMemoryCache.length > 0) {
    onUpdate(clientCategoriesMemoryCache);
  }

  getCategoriesFromFirestore()
    .then((cats) => {
      if (active && cats && cats.length > 0) {
        onUpdate(cats);
      }
    })
    .catch(() => {});

  return () => {
    active = false;
  };
}

// Dedicated category fetcher with memory-first lookup and targeted Firestore query
export async function getBooksByCategory(categorySlugOrTitle: string): Promise<Book[]> {
  if (!categorySlugOrTitle) return [];
  let decoded = categorySlugOrTitle;
  try {
    decoded = decodeURIComponent(categorySlugOrTitle);
  } catch {}
  const rawTarget = decoded.trim();
  const targetLower = rawTarget.toLowerCase();
  const cleanTarget = targetLower.replace(/-exams?$/, '').replace(/\s+exams?$/, '');

  const matchesBook = (b: Book): boolean => {
    if (!b) return false;
    const bCat = (b.category || '').toLowerCase().trim();
    const bSlug = (b.categorySlug || '').toLowerCase().trim();
    return (
      bCat === targetLower ||
      bCat === cleanTarget ||
      bSlug === targetLower ||
      bSlug === cleanTarget ||
      (cleanTarget.length > 3 && bCat.includes(cleanTarget)) ||
      (cleanTarget.length > 3 && cleanTarget.includes(bCat)) ||
      (Array.isArray(b.tags) &&
        b.tags.some((t) => {
          const tLower = String(t || '').toLowerCase().trim();
          return tLower === targetLower || tLower === cleanTarget;
        }))
    );
  };

  // 1. Check in-memory caches (0ms instant resolution)
  const isServer = typeof window === 'undefined';
  const cachedList = isServer ? serverBooksCache : clientBooksMemoryCache;
  if (cachedList && cachedList.length > 0) {
    const matched = cachedList.filter(matchesBook);
    if (matched.length > 0) {
      return matched;
    }
  }

  // 2. Direct fast Firestore REST query for this specific category
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const titleCase = rawTarget.charAt(0).toUpperCase() + rawTarget.slice(1).toLowerCase();
    const cleanTitleCase = cleanTarget.charAt(0).toUpperCase() + cleanTarget.slice(1).toLowerCase();

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents:runQuery?key=${FIREBASE_API_KEY}`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'books' }],
        where: {
          compositeFilter: {
            op: 'OR',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'category' },
                  op: 'EQUAL',
                  value: { stringValue: titleCase },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'category' },
                  op: 'EQUAL',
                  value: { stringValue: cleanTitleCase },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'category' },
                  op: 'EQUAL',
                  value: { stringValue: rawTarget },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'category' },
                  op: 'EQUAL',
                  value: { stringValue: cleanTarget },
                },
              },
            ],
          },
        },
        limit: 500,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const books: Book[] = [];
        for (const item of data) {
          if (item && item.document) {
            const parsed = parseFirestoreRestDocument(item.document);
            books.push(parseBookDocument(parsed));
          }
        }
        if (books.length > 0) {
          return books;
        }
      }
    }
  } catch {}

  // 3. Fallback: get full catalog and filter
  const allBooks = await getBooksFromFirestore();
  return allBooks.filter(matchesBook);
}

// Helper to match a book in a list by ID, seoslug, slug, or title
function findBookInList(books: Book[], target: string): Book | null {
  if (!Array.isArray(books) || books.length === 0 || !target) return null;

  // Priority 1: Exact ID match
  const exactIdMatch = books.find((b) => b && b.id && b.id.toLowerCase() === target);
  if (exactIdMatch) return exactIdMatch;

  // Priority 2: seoslug or slug match
  const slugMatch = books.find(
    (b) =>
      b &&
      ((b.seoslug && b.seoslug.toLowerCase() === target) ||
        (b.slug && b.slug.toLowerCase() === target))
  );
  if (slugMatch) return slugMatch;

  // Priority 3: ID suffix / sub-match
  const suffixMatch = books.find(
    (b) =>
      b &&
      b.id &&
      (b.id.toLowerCase().endsWith(target) || target.endsWith(b.id.toLowerCase()))
  );
  if (suffixMatch) return suffixMatch;

  // Priority 4: Title match
  const titleMatch = books.find((b) => b && b.title && b.title.toLowerCase() === target);
  if (titleMatch) return titleMatch;

  return null;
}

// Fetch a single book by ID or Slug from Firestore with 0ms cache-first lookup
export async function getFirestoreBookById(idOrSlug: string): Promise<Book | null> {
  if (!idOrSlug) return null;
  let decoded = idOrSlug;
  try {
    decoded = decodeURIComponent(idOrSlug);
  } catch {}
  const rawTarget = decoded.trim();
  const target = rawTarget.toLowerCase();
  const isServer = typeof window === 'undefined';

  // 1. Check in-memory full catalog cache FIRST (0ms instant resolution!)
  if (isServer && serverBooksCache && serverBooksCache.length > 0) {
    const cachedHit = findBookInList(serverBooksCache, target);
    if (cachedHit) return cachedHit;
  }
  if (!isServer && clientBooksMemoryCache && clientBooksMemoryCache.length > 0) {
    const cachedHit = findBookInList(clientBooksMemoryCache, target);
    if (cachedHit) return cachedHit;
  }

  // 2. Direct REST single doc read if rawTarget looks like a document ID (no network hang)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/books/${encodeURIComponent(rawTarget)}?key=${FIREBASE_API_KEY}`,
      { signal: controller.signal, cache: 'no-store' }
    );
    clearTimeout(timer);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const text = await res.text();
        if (!text.trim().startsWith('<')) {
          const json = JSON.parse(text);
          const parsed = parseFirestoreRestDocument(json);
          if (parsed && parsed.id) {
            return parseBookDocument(parsed);
          }
        }
      }
    }
  } catch {}

  // 3. Search in full book list (populates serverBooksCache / clientBooksMemoryCache)
  const books = await getBooksFromFirestore();
  const listMatch = findBookInList(books, target);
  if (listMatch) return listMatch;

  // 4. Fallback to cached sync data
  const fallbackList = getCachedBooksSync();
  return findBookInList(fallbackList, target);
}

export const LOCAL_STORAGE_SOLD_COUNTS_KEY = 'bookscircle_sold_counts_cache';
let clientSoldCountsCache: Record<string, number> | null = null;
let clientSoldCountsExpiresAt = 0;

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
  if (clientSoldCountsCache && Object.keys(clientSoldCountsCache).length > 0) {
    return clientSoldCountsCache;
  }
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SOLD_COUNTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          clientSoldCountsCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return {};
}

/**
 * Lightweight aggregator for actual sold book items.
 * Uses cached counts first and performs a single non-blocking check every 5 minutes
 * instead of opening 3 concurrent unbounded WebChannel onSnapshot streams on every navigation.
 */
export function subscribeToSoldBookCounts(
  onSoldCountsUpdated: (counts: Record<string, number>) => void
): () => void {
  let active = true;
  const cached = getCachedSoldCountsSync();
  if (cached && Object.keys(cached).length > 0) {
    onSoldCountsUpdated(cached);
  }

  const now = Date.now();
  if (clientSoldCountsCache && now < clientSoldCountsExpiresAt) {
    return () => {
      active = false;
    };
  }

  (async () => {
    try {
      const [purchasesSnap, ordersSnap, analyticsSnap] = await Promise.all([
        getDocs(query(collection(db, 'purchases'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'orders'), limit(500))).catch(() => null),
        getDocs(query(collection(db, 'book_analytics'), limit(500))).catch(() => null),
      ]);

      if (!active) return;

      const books = clientBooksMemoryCache || getCachedBooksSync();
      const countMap: Record<string, number> = { ...cached };

      const recordSale = (rawKey: string, count = 1) => {
        if (!rawKey) return;
        const k = String(rawKey).trim();
        const normK = normalizeSlugKey(k);

        const matched = books.find(
          (b) =>
            b &&
            (b.id === k ||
              (b.id && b.id.toLowerCase() === k.toLowerCase()) ||
              (b.seoslug && b.seoslug.toLowerCase() === k.toLowerCase()) ||
              (b.slug && b.slug.toLowerCase() === k.toLowerCase()) ||
              (normK.length > 8 && normalizeSlugKey(b.seoslug || '') === normK) ||
              (normK.length > 8 && normalizeSlugKey(b.slug || '') === normK))
        );

        const targetBookId = matched ? matched.id : k;
        countMap[targetBookId] = (countMap[targetBookId] || 0) + count;
      };

      const currentPurchases: any[] = purchasesSnap ? purchasesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
      const currentOrders: any[] = ordersSnap ? ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
      const currentAnalytics: any[] = analyticsSnap ? analyticsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];

      if (currentPurchases.length > 0 || currentOrders.length > 0 || currentAnalytics.length > 0) {
        // Reset fresh map when live data arrives
        const freshMap: Record<string, number> = {};
        const recordFresh = (rawKey: string, count = 1) => {
          if (!rawKey) return;
          const k = String(rawKey).trim();
          const normK = normalizeSlugKey(k);
          const matched = books.find(
            (b) =>
              b &&
              (b.id === k ||
                (b.id && b.id.toLowerCase() === k.toLowerCase()) ||
                (b.seoslug && b.seoslug.toLowerCase() === k.toLowerCase()) ||
                (b.slug && b.slug.toLowerCase() === k.toLowerCase()) ||
                (normK.length > 8 && normalizeSlugKey(b.seoslug || '') === normK) ||
                (normK.length > 8 && normalizeSlugKey(b.slug || '') === normK))
          );
          const targetBookId = matched ? matched.id : k;
          freshMap[targetBookId] = (freshMap[targetBookId] || 0) + count;
        };

        currentPurchases.forEach((p) => {
          if (Array.isArray(p.bookIds)) {
            p.bookIds.forEach((id: string) => recordFresh(id, 1));
          }
        });

        const purchaseOrderIds = new Set(currentPurchases.map((p) => p.orderId).filter(Boolean));
        currentOrders.forEach((o) => {
          if (!purchaseOrderIds.has(o.orderId) && !purchaseOrderIds.has(o.id)) {
            if (Array.isArray(o.bookIds)) {
              o.bookIds.forEach((id: string) => recordFresh(id, 1));
            }
          }
        });

        currentAnalytics.forEach((a) => {
          if (a.bookId && typeof a.totalPurchases === 'number' && a.totalPurchases > (freshMap[a.bookId] || 0)) {
            freshMap[a.bookId] = a.totalPurchases;
          }
        });

        clientSoldCountsCache = freshMap;
        clientSoldCountsExpiresAt = Date.now() + 5 * 60 * 1000;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_SOLD_COUNTS_KEY, JSON.stringify(freshMap));
          } catch {}
        }
        if (active) {
          onSoldCountsUpdated(freshMap);
        }
      }
    } catch {}
  })();

  return () => {
    active = false;
  };
}

