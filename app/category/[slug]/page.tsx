import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
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
    if (!b || b.isActive === false || b.canonicalSlug) return false;
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
  if (!category) {
    return {
      title: 'Category Not Found',
      description: 'The requested exam category could not be found in our catalog.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = category.title;
  const canonicalSlug = category.seolsug || category.id;
  const seoCat = category.seoCat || '';
  const metaDescription =
    seoCat ||
    `Download ${title} PDF e-books, previous year solved question papers, and competitive exam study material with instant preview on ${SITE_NAME}.`;
  const url = `${SITE_URL}/category/${encodeURIComponent(canonicalSlug)}`;

  return {
    title: `${title} PDF E-Books & Study Material`,
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
  const decodedSlug = decodeURIComponent(slug);

  let categories: Category[] = [];
  let books: Book[] = [];

  try {
    const [catsData, booksData] = await Promise.all([
      getCategoriesFromFirestore(),
      getBooksFromFirestore(),
    ]);
    categories = catsData.length > 0 ? catsData : INITIAL_CATEGORIES;
    books = (booksData.length > 0 ? booksData : INITIAL_BOOKS).filter(
      (b) => b && b.isActive !== false && !b.canonicalSlug
    );
  } catch {
    categories = INITIAL_CATEGORIES;
    books = INITIAL_BOOKS;
  }

  const category = matchCategory(decodedSlug, categories);
  const categoryTitle = category ? category.title : decodedSlug;
  const seoCat = category?.seoCat || '';

  // 301 Redirect non-canonical category slug variants to the canonical category slug
  const canonicalCategorySlug = category ? category.seolsug || category.id : '';
  if (
    category &&
    canonicalCategorySlug &&
    decodedSlug.toLowerCase() !== canonicalCategorySlug.toLowerCase()
  ) {
    permanentRedirect(`/category/${encodeURIComponent(canonicalCategorySlug)}`);
  }

  // Fetch verified category books directly from Firestore with fallback to local filter
  let categoryBooks = (await getBooksByCategory(categoryTitle || decodedSlug)).filter(
    (b) => b && b.isActive !== false && !b.canonicalSlug
  );
  if (categoryBooks.length === 0 && category) {
    categoryBooks = filterBooksByCategory(category, books);
  }
  if (categoryBooks.length === 0) {
    const rawTarget = decodedSlug.toLowerCase().trim();
    categoryBooks = books.filter((b) => (b?.category || '').toLowerCase().trim() === rawTarget);
  }

  // Return genuine HTTP 404 when neither a valid category nor any matching books exist
  if (!category && categoryBooks.length === 0) {
    notFound();
  }

  const targetBooks = categoryBooks.map(slimBookForList);

  // Schema.org JSON-LD for rich SEO
  const jsonLd = generateCategorySchema(
    categoryTitle,
    canonicalCategorySlug || decodedSlug,
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
        categorySlug={canonicalCategorySlug || decodedSlug}
        seoCat={seoCat}
        books={targetBooks}
        allCategories={categories}
      />
    </>
  );
}
