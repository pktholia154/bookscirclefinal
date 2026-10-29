const fs = require('fs');

const FIREBASE_API_KEY = 'AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk';
const PROJECT_ID = 'bookscircle-d579d';
const FIRESTORE_DATABASE_ID = 'bookscircle';

function sanitize(val) {
  if (typeof val !== 'string') return val;
  let cleaned = val.toWellFormed ? val.toWellFormed() : val;
  cleaned = cleaned
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, '')
    .normalize('NFC')
    .trim();
  return cleaned;
}

function parseFirestoreValue(valObj) {
  if (!valObj) return undefined;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('timestampValue' in valObj) return valObj.timestampValue;
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    return Array.isArray(valObj.arrayValue?.values)
      ? valObj.arrayValue.values.map(parseFirestoreValue)
      : [];
  }
  if ('mapValue' in valObj) {
    const res = {};
    const fields = valObj.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return valObj;
}

function parseDoc(docObj) {
  const fields = docObj.fields || {};
  const res = {};
  for (const [k, v] of Object.entries(fields)) {
    res[k] = parseFirestoreValue(v);
  }
  const parts = (docObj.name || '').split('/');
  res.id = res.id || parts[parts.length - 1] || '';
  return res;
}

async function exportData() {
  console.log('Fetching collections from Firestore bookscircle via REST...');

  // 1. Fetch categories
  const catUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/categories?pageSize=100&key=${FIREBASE_API_KEY}`;
  const catRes = await fetch(catUrl);
  const catData = await catRes.json();
  const rawCats = (catData.documents || []).map(parseDoc);

  const categories = rawCats.map((data) => ({
    id: sanitize(data.id),
    title: sanitize(data.name || data.title || data.id),
    seolsug: sanitize(data.seoslug || data.slug || data.id),
    seo_description: sanitize(data.seo_description || data.description || ''),
  }));

  // 2. Fetch books (batch of 100 for static hydration snapshot)
  const bookUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/books?pageSize=100&key=${FIREBASE_API_KEY}`;
  const bookRes = await fetch(bookUrl);
  const bookData = await bookRes.json();
  const rawBooks = (bookData.documents || []).map(parseDoc);

  const books = rawBooks.map((data) => {
    const bookId = sanitize(data.id);
    const buyPrice = Number(data.buyprice ?? data.buy_price ?? data.price ?? data.sale_price ?? 0);
    const listPrice = Number(data.listprice ?? data.list_price ?? data.mrp ?? data.original_price ?? buyPrice);
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
      rating: 0,
      rating_count: 0,
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
      reviews: [],
    };
  });

  const tsContent = `import { Book, Category } from './types';\n\nexport const DEFAULT_BOOK_COVER = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop';\n\nexport const INITIAL_CATEGORIES: Category[] = ${JSON.stringify(categories, null, 2)};\n\nexport const FREE_SAMPLE_BOOK_ID = 'BK0000001';\n\nexport const INITIAL_BOOKS: Book[] = ${JSON.stringify(books, null, 2)};\n\nexport const FREE_SAMPLE_BOOK: Book = INITIAL_BOOKS[0];\n`;

  fs.writeFileSync('lib/data.ts', tsContent, 'utf8');
  console.log(`Success: Generated clean UTF-8 lib/data.ts with ${categories.length} categories and ${books.length} books.`);
  process.exit(0);
}

exportData().catch((err) => {
  console.error('Export error:', err);
  process.exit(1);
});
