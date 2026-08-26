import {
  collection,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db, defaultDb, ensureFirebaseAuth } from '../firebase';
import { Book, Category } from '../types';
import { DEFAULT_BOOK_COVER } from '../data';

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

// Fetch all books solely from Firestore DB 'bookscircle'
export async function getBooksFromFirestore(): Promise<Book[]> {
  purgeLegacyDemoCache();

  // Try fetching from Firestore database instances (named 'bookscircle' first, then default)
  const instances = [db, defaultDb];
  let lastError: unknown = null;

  for (const databaseInstance of instances) {
    try {
      const booksCol = collection(databaseInstance, 'books');
      const snapshot = await getDocs(booksCol);
      
      if (!snapshot.empty) {
        const books: Book[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          // Flexible mapping supporting various field names
          const buyPrice = Number(data.buyprice ?? data.buy_price ?? data.price ?? data.sale_price ?? 0);
          const listPrice = Number(data.listprice ?? data.list_price ?? data.mrp ?? data.original_price ?? buyPrice);
          const rating = Number(data.averageRating ?? data.rating ?? data.avg_rating ?? 0);
          const ratingCount = Number(data.reviewCount ?? data.rating_count ?? data.ratings_count ?? data.review_count ?? 0);
          const pages = Number(data.pageCount ?? data.pages ?? data.page_count ?? data.num_pages ?? 0);

          const seoDesc = String(data.seo_description ?? data.seoDescription ?? data.short_description ?? data.shortDescription ?? data.subtitle ?? '').trim();
          const fullDesc = String(data.full_description ?? data.fullDescription ?? data.description ?? data.summary ?? data.content ?? '').trim();

          books.push({
            id: docSnap.id,
            title: data.title || data.name || 'Untitled Book',
            slug: data.slug || docSnap.id,
            seo_description: seoDesc,
            full_description: fullDesc,
            seoDescription: seoDesc,
            fullDescription: fullDesc,
            category: data.category || 'General',
            tags: Array.isArray(data.tags) ? data.tags : [],
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
            buy_price: buyPrice,
            list_price: listPrice,
            pdf_file: data.pdfurl || data.pdf_file || data.pdf_url || data.file_url || '',
            cover: data.imageUrl || data.cover || data.cover_image || data.image || data.thumbnail || data.image_url || DEFAULT_BOOK_COVER,
            sample_file: data.sampleurl || data.sample_file || data.sample_pdf || data.sample_url || '',
            rating: rating > 0 ? rating : 4.5,
            rating_count: ratingCount > 0 ? ratingCount : 0,
            author: data.author || data.authors || 'Unknown Author',
            publisher: data.publisher || 'Publisher',
            published_date: data.published_date || data.published_year || data.publish_date || '',
            isbn: data.isbn || '',
            pages: pages > 0 ? pages : 0,
            language: data.language || 'English',
            file_size: data.fileSizeInMB ? `${data.fileSizeInMB} MB` : (data.file_size || ''),
            topics: Array.isArray(data.topics) ? data.topics : (Array.isArray(data.features) ? data.features : []),
            reviews: Array.isArray(data.reviews) ? data.reviews : [],
          });
        });

        // Cache live Firestore data for offline resilience
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_BOOKS_KEY, JSON.stringify(books));
          } catch {}
        }

        return books;
      }
    } catch (error) {
      lastError = error;
      console.warn('Firestore fetch from instance:', error);
    }
  }

  // If no books in Firestore or offline, check if we had cached real Firestore data
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

  if (lastError) {
    console.error('Error querying Firestore books collection:', lastError);
  }

  // Strictly return empty array - NO demo data
  return [];
}

// Fetch all categories solely from Firestore DB 'bookscircle'
export async function getCategoriesFromFirestore(): Promise<Category[]> {
  purgeLegacyDemoCache();

  const instances = [db, defaultDb];

  for (const databaseInstance of instances) {
    try {
      const catCol = collection(databaseInstance, 'categories');
      const snapshot = await getDocs(catCol);
      
      if (!snapshot.empty) {
        const categories: Category[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          categories.push({
            id: docSnap.id,
            title: data.title || data.name || docSnap.id,
            seolsug: data.seolsug || data.slug || docSnap.id,
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
    } catch (error) {
      console.warn('Firestore categories fetch:', error);
    }
  }

  // Check cached Firestore categories
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

  return [];
}

// Fetch a single book by ID or Slug from Firestore
export async function getFirestoreBookById(idOrSlug: string): Promise<Book | null> {
  const books = await getBooksFromFirestore();
  const found = books.find(
    (b) => b.id === idOrSlug || b.slug === idOrSlug || b.title.toLowerCase() === idOrSlug.toLowerCase()
  );
  return found || null;
}
