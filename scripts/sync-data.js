const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
  apiKey: 'AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk',
  authDomain: 'bookscircle-d579d.firebaseapp.com',
  projectId: 'bookscircle-d579d',
  storageBucket: 'bookscircle-d579d.firebasestorage.app',
  messagingSenderId: '321886714441',
  appId: '1:321886714441:web:3bde6fb916b24a509cdd98'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'bookscircle');

function sanitize(val) {
  if (typeof val !== 'string') return val;
  // Normalize Unicode and replace unprintable control codes safely
  let cleaned = val
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, '')
    .trim();

  return cleaned;
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitize(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = sanitizeObject(v);
    }
    return res;
  }
  return obj;
}

async function exportData() {
  console.log('Fetching collections from Firestore bookscircle...');
  const booksSnap = await getDocs(collection(db, 'books'));
  const catSnap = await getDocs(collection(db, 'categories'));

  const categories = catSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: sanitize(doc.id),
      title: sanitize(data.name || data.title || doc.id),
      seolsug: sanitize(data.seoslug || data.slug || doc.id),
      seo_description: sanitize(data.seo_description || data.description || '')
    };
  });

  const books = booksSnap.docs.map(doc => {
    const data = doc.data();
    const bookId = sanitize(doc.id);
    const buyPrice = Number(data.buyprice ?? data.buy_price ?? data.price ?? data.sale_price ?? 0);
    const listPrice = Number(data.listprice ?? data.list_price ?? data.mrp ?? data.original_price ?? buyPrice);
    const rating = Number(data.averageRating ?? data.rating ?? data.avg_rating ?? 0);
    const ratingCount = Number(data.reviewCount ?? data.rating_count ?? data.ratings_count ?? data.review_count ?? 0);
    const pages = Number(data.pageCount ?? data.pages ?? data.page_count ?? data.num_pages ?? 0);

    const seoDesc = sanitize(data.seo_description ?? data.seoDescription ?? data.short_description ?? data.shortDescription ?? data.subtitle ?? '');
    const fullDesc = sanitize(data.full_description ?? data.fullDescription ?? data.description ?? data.summary ?? data.content ?? '');
    const seoslug = sanitize(data.seoslug ?? data.slug ?? bookId);
    const categorySlug = sanitize(data.categorySlug ?? data.category_slug ?? '');

    const rawCover = sanitize(data.imageUrl || data.cover || data.cover_image || data.image || data.thumbnail || data.image_url || data.coverImage || data.coverUrl || '');
    const rawSample = sanitize(data.sampleUrl || data.sampleurl || data.sample_file || data.sample_pdf || data.sample_url || data.sampleFile || data.preview_url || data.sample || '');
    const rawPdf = sanitize(data.pdf_file || data.pdfFile || data.pdfurl || data.pdf_url || data.pdfUrl || data.pdfStoragePath || data.pdf_storage_path || data.full_pdf_url || data.file_url || data.fileUrl || data.download_url || data.downloadUrl || data.book_file || data.full_file || data.url || data.pdf || '');

    return {
      id: bookId,
      title: sanitize(data.title || data.name || 'Untitled Book'),
      slug: seoslug,
      seoslug: seoslug,
      seo_description: seoDesc,
      full_description: fullDesc,
      seoDescription: seoDesc,
      fullDescription: fullDesc,
      category: sanitize(data.category || 'CUET PG'),
      categorySlug: categorySlug || 'cuet-pg',
      tags: Array.isArray(data.tags) ? data.tags.map(sanitize) : [],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      buy_price: buyPrice,
      list_price: listPrice,
      pdf_file: rawPdf,
      pdfUrl: rawPdf,
      pdf_url: rawPdf,
      pdfStoragePath: rawPdf,
      hasFullPdf: Boolean(rawPdf),
      cover: rawCover,
      imageUrl: rawCover,
      sample_file: rawSample,
      sampleUrl: rawSample,
      rating: rating > 0 ? rating : 4.5,
      rating_count: ratingCount > 0 ? ratingCount : 0,
      author: sanitize(data.author || data.authors || 'Mocktime Publication'),
      publisher: sanitize(data.publisher || data.publication || 'Mocktime Publication'),
      publication: sanitize(data.publication || data.publisher || 'Mocktime Publication'),
      published_date: sanitize(data.published_date || data.published_year || data.publish_date || '2026'),
      isbn: sanitize(data.isbn || ''),
      pages: pages > 0 ? pages : 0,
      language: sanitize(data.language || 'English'),
      type: sanitize(data.type || data.format || data.book_type || 'Question Bank'),
      file_size: data.fileSizeInMB ? `${data.fileSizeInMB} MB` : sanitize(data.file_size || ''),
      topics: Array.isArray(data.topics) ? data.topics.map(sanitize) : (Array.isArray(data.features) ? data.features.map(sanitize) : []),
      reviews: Array.isArray(data.reviews) ? sanitizeObject(data.reviews) : [],
    };
  });

  const tsContent = `import { Book, Category } from './types';\n\nexport const DEFAULT_BOOK_COVER = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop';\n\nexport const INITIAL_CATEGORIES: Category[] = ${JSON.stringify(categories, null, 2)};\n\nexport const INITIAL_BOOKS: Book[] = ${JSON.stringify(books, null, 2)};\n`;

  fs.writeFileSync('lib/data.ts', tsContent, 'utf8');
  console.log(`Success: Generated clean UTF-8 lib/data.ts with ${categories.length} categories and ${books.length} books.`);
  process.exit(0);
}

exportData().catch(err => {
  console.error('Export error:', err);
  process.exit(1);
});
