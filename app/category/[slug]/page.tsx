import { Metadata } from 'next';
import {
  getBooksFromFirestore,
  getCategoriesFromFirestore,
  getBooksByCategory,
  slimBookForList,
} from '@/lib/services/books';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';
import { Book, Category } from '@/lib/types';
import { generateCategorySchema, SITE_URL, SITE_NAME } from '@/lib/seo';
import { CategoryPageClient } from '@/components/CategoryPageClient';

export const revalidate = 300; // ISR revalidate every 5 minutes

interface Props {
  params: Promise<{ slug: string }>;
}

function matchCategory(slug: string, categories: Category[]): Category | undefined {
  const decoded = decodeURIComponent(slug).toLowerCase().trim();
  const slugClean = decoded.replace(/-exams?$/, '').replace(/\s+exams?$/, '');
  return categories.find(
    (c) =>
      c &&
      ((c.seolsug && c.seolsug.toLowerCase() === decoded) ||
        (c.seolsug && c.seolsug.toLowerCase() === slugClean) ||
        (c.id && c.id.toLowerCase() === decoded) ||
        (c.id && c.id.toLowerCase() === slugClean) ||
        (c.title && c.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') === decoded) ||
        (c.title && c.title.toLowerCase() === decoded) ||
        (c.title && c.title.toLowerCase().replace(/\s+exams?$/, '') === slugClean))
  );
}

function filterBooksByCategory(category: Category, books: Book[]): Book[] {
  const catTitleLower = (category.title || '').toLowerCase().trim();
  const catIdLower = (category.id || '').toLowerCase().trim();
  const catSlugLower = (category.seolsug || '').toLowerCase().trim();
  const catClean = catTitleLower.replace(/\s+exams?$/, '').replace(/-exams?$/, '');

  return books.filter((b) => {
    if (!b) return false;
    const bookCat = (b.category || '').toLowerCase().trim();
    const bookCatSlug = (b.categorySlug || '').toLowerCase().trim();
    return (
      bookCat === catTitleLower ||
      bookCat === catIdLower ||
      bookCat === catSlugLower ||
      bookCat === catClean ||
      bookCatSlug === catIdLower ||
      bookCatSlug === catSlugLower ||
      bookCatSlug === catClean ||
      (catClean.length > 3 && bookCat.includes(catClean)) ||
      (catClean.length > 3 && catClean.includes(bookCat)) ||
      (Array.isArray(b.tags) &&
        b.tags.some((t) => {
          const tLower = String(t || '').toLowerCase().trim();
          return tLower === catTitleLower || tLower === catClean;
        }))
    );
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let categories: Category[] = [];
  try {
    categories = await getCategoriesFromFirestore();
  } catch {}
  if (!categories || categories.length === 0) categories = INITIAL_CATEGORIES;

  const category = matchCategory(slug, categories);
  const title = category ? category.title : decodeURIComponent(slug);
  const canonicalSlug = category ? (category.seolsug || category.id) : decodeURIComponent(slug);
  const seoCat = category?.seoCat || '';
  const metaDescription =
    seoCat ||
    `Download ${title} PDF e-books, previous year solved question papers, and competitive exam study material with instant preview on ${SITE_NAME}.`;
  const url = `${SITE_URL}/category/${encodeURIComponent(canonicalSlug)}`;

  return {
    title: `${title} PDF E-Books & Study Material | ${SITE_NAME}`,
    description: metaDescription,
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${title} E-Books & Exam Preparation PDF Library | ${SITE_NAME}`,
      description: metaDescription,
      url: url,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} PDF E-Books | ${SITE_NAME}`,
      description: metaDescription,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  let categories: Category[] = [];
  let books: Book[] = [];

  try {
    const [catsData, booksData] = await Promise.all([
      getCategoriesFromFirestore(),
      getBooksFromFirestore(),
    ]);
    categories = catsData.length > 0 ? catsData : INITIAL_CATEGORIES;
    books = booksData.length > 0 ? booksData : INITIAL_BOOKS;
  } catch {
    categories = INITIAL_CATEGORIES;
    books = INITIAL_BOOKS;
  }

  const category = matchCategory(slug, categories);
  const categoryTitle = category ? category.title : decodeURIComponent(slug);
  const seoCat = category?.seoCat || '';

  // Fetch verified category books directly from Firestore with fallback to local filter
  let categoryBooks = await getBooksByCategory(categoryTitle || slug);
  if (categoryBooks.length === 0 && category) {
    categoryBooks = filterBooksByCategory(category, books);
  }
  if (categoryBooks.length === 0) {
    const rawTarget = decodeURIComponent(slug).toLowerCase().trim();
    categoryBooks = books.filter((b) => (b?.category || '').toLowerCase().trim() === rawTarget);
  }

  const targetBooks = (categoryBooks.length > 0 ? categoryBooks : books.slice(0, 72)).map(slimBookForList);

  // Schema.org JSON-LD for rich SEO
  const jsonLd = generateCategorySchema(
    categoryTitle,
    slug,
    seoCat,
    targetBooks.slice(0, 24)
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoryPageClient
        categoryTitle={categoryTitle}
        categorySlug={slug}
        seoCat={seoCat}
        books={targetBooks}
        allCategories={categories}
      />
    </>
  );
}
