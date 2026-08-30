import {
  collection,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db, defaultDb, ensureFirebaseAuth } from '../firebase';
import { Book, Category } from '../types';
import { DEFAULT_BOOK_COVER, INITIAL_BOOKS, INITIAL_CATEGORIES } from '../data';
import {
  resolveBookCoverUrl,
  resolveBookSampleUrl,
  resolveBookPdfUrl,
  resolveFullBookStoragePath,
} from './storage';

const LOCAL_STORAGE_BOOKS_KEY = 'bookscircle_live_books_cache';
const LOCAL_STORAGE_CATEGORIES_KEY = 'bookscircle_live_categories_cache';

// Helper to purge any legacy demo data from localStorage
export function purgeLegacyDemoCache() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('bookscircle_local_books');
      localStorage.removeItem('bookscircle_local_categories');
    } catch {
      // ignore
    }
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
  const data = docSnap.data();
  const bookId = docSnap.id;
  const buyPrice = Number(data.buyprice ?? data.buy_price ?? data.price ?? data.sale_price ?? 0);
  const listPrice = Number(data.listprice ?? data.list_price ?? data.mrp ?? data.original_price ?? buyPrice);
  const rating = Number(data.averageRating ?? data.rating ?? data.avg_rating ?? 0);
  const ratingCount = Number(data.reviewCount ?? data.rating_count ?? data.ratings_count ?? data.review_count ?? 0);
  const pages = Number(data.pageCount ?? data.pages ?? data.page_count ?? data.num_pages ?? 0);

  const seoDesc = String(data.seo_description ?? data.seoDescription ?? data.short_description ?? data.shortDescription ?? data.subtitle ?? '').trim();
  const fullDesc = String(data.full_description ?? data.fullDescription ?? data.description ?? data.summary ?? data.content ?? '').trim();
  const seoslug = String(data.seoslug ?? data.slug ?? bookId).trim();
  const categorySlug = String(data.categorySlug ?? data.category_slug ?? '').trim();

  const rawCover = data.imageUrl || data.cover || data.cover_image || data.image || data.thumbnail || data.image_url || data.coverImage || data.coverUrl || '';
  const resolvedCover = resolveBookCoverUrl(rawCover, bookId);

  const rawSample = data.sampleUrl || data.sampleurl || data.sample_file || data.sample_pdf || data.sample_url || data.sampleFile || data.preview_url || data.sample || '';
  const resolvedSample = resolveBookSampleUrl(rawSample, bookId);

  const rawPdfStoragePath = data.pdf_file || data.pdfFile || data.pdfurl || data.pdf_url || data.pdfUrl || data.pdfStoragePath || data.pdf_storage_path || data.full_pdf_url || data.file_url || data.fileUrl || data.download_url || data.downloadUrl || data.book_file || data.full_file || data.url || data.pdf || '';
  const resolvedFullPdfUrl = resolveBookPdfUrl(rawPdfStoragePath, bookId);

  return {
    id: bookId,
    title: data.title || data.name || 'Untitled Book',
    slug: seoslug,
    seoslug: seoslug,
    seo_description: seoDesc,
    full_description: fullDesc,
    seoDescription: seoDesc,
    fullDescription: fullDesc,
    category: data.category || 'General',
    categorySlug: categorySlug,
    tags: Array.isArray(data.tags) ? data.tags : [],
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    buy_price: buyPrice,
    list_price: listPrice,
    pdf_file: resolvedFullPdfUrl,
    pdfUrl: resolvedFullPdfUrl,
    pdf_url: resolvedFullPdfUrl,
    pdfStoragePath: resolvedFullPdfUrl,
    hasFullPdf: data.hasFullPdf !== undefined ? Boolean(data.hasFullPdf) : true,
    cover: resolvedCover,
    imageUrl: resolvedCover,
    sample_file: resolvedSample,
    sampleUrl: resolvedSample,
    rating: rating > 0 ? rating : 4.5,
    rating_count: ratingCount > 0 ? ratingCount : 0,
    author: data.author || data.authors || 'Exam Editorial Panel',
    publisher: data.publisher || data.publication || 'Exam Kart',
    publication: data.publication || data.publisher || 'Exam Kart',
    published_date: data.published_date || data.published_year || data.publish_date || '',
    isbn: data.isbn || '',
    pages: pages > 0 ? pages : 0,
    language: data.language || 'English',
    type: data.type || data.format || data.book_type || data.edition || 'PDF Ebook',
    file_size: data.fileSizeInMB ? `${data.fileSizeInMB} MB` : (data.file_size || ''),
    topics: Array.isArray(data.topics) ? data.topics : (Array.isArray(data.features) ? data.features : []),
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
  };
}

// Fetch all books with fast timeout to ensure instant UI responsiveness
export async function getBooksFromFirestore(): Promise<Book[]> {
  purgeLegacyDemoCache();

  // Fast fallback data ready immediately
  const fallback = getCachedBooksSync();

  // Create a timeout promise to never block for more than 2 seconds
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 2000)
  );

  const fetchPromise = (async (): Promise<Book[] | null> => {
    try {
      const booksCol = collection(db, 'books');
      const snapshot = await getDocs(booksCol);

      if (!snapshot.empty) {
        const books: Book[] = [];
        snapshot.forEach((docSnap) => {
          books.push(parseBookDocument(docSnap));
        });

        // Cache live Firestore data
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(books));
          } catch {}
        }

        return books;
      }
      return null;
    } catch (error) {
      console.warn('Firestore fetch books note:', error);
      return null;
    }
  })();

  const result = await Promise.race([fetchPromise, timeoutPromise]);
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
        console.warn('Firestore real-time books listener note:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to books:', err);
    return () => {};
  }
}

// Fetch all categories with fast timeout
export async function getCategoriesFromFirestore(): Promise<Category[]> {
  purgeLegacyDemoCache();

  const fallback = getCachedCategoriesSync();

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 2000)
  );

  const fetchPromise = (async (): Promise<Category[] | null> => {
    try {
      const catCol = collection(db, 'categories');
      const snapshot = await getDocs(catCol);

      if (!snapshot.empty) {
        const categories: Category[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          categories.push({
            id: docSnap.id,
            title: data.name || data.title || docSnap.id,
            seolsug: data.seoslug || data.slug || docSnap.id,
            seo_description: data.seo_description || data.description || '',
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
    } catch (error) {
      console.warn('Firestore categories fetch note:', error);
      return null;
    }
  })();

  const result = await Promise.race([fetchPromise, timeoutPromise]);
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
            categories.push({
              id: docSnap.id,
              title: data.name || data.title || docSnap.id,
              seolsug: data.seoslug || data.slug || docSnap.id,
              seo_description: data.seo_description || data.description || '',
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
        console.warn('Firestore real-time categories listener note:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to categories:', err);
    return () => {};
  }
}

// Fetch a single book by ID or Slug from Firestore or fast cache
export async function getFirestoreBookById(idOrSlug: string): Promise<Book | null> {
  const books = await getBooksFromFirestore();
  const target = idOrSlug.trim().toLowerCase();
  const found = books.find(
    (b) =>
      (b.seoslug && b.seoslug.toLowerCase() === target) ||
      (b.slug && b.slug.toLowerCase() === target) ||
      b.id.toLowerCase() === target ||
      b.title.toLowerCase() === target
  );
  if (found) return found;

  const fallback = getCachedBooksSync().find(
    (b) =>
      (b.seoslug && b.seoslug.toLowerCase() === target) ||
      (b.slug && b.slug.toLowerCase() === target) ||
      b.id.toLowerCase() === target ||
      b.title.toLowerCase() === target
  );
  return fallback || null;
}

