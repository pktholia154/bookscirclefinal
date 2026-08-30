import { Metadata } from 'next';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';
import { Book, Category } from '@/lib/types';
import { generateCategorySchema, SITE_URL, SITE_NAME } from '@/lib/seo';
import { CategoryPageClient } from '@/components/CategoryPageClient';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

function matchCategory(slug: string, categories: Category[]): Category | undefined {
  const decoded = decodeURIComponent(slug).toLowerCase().trim();
  return categories.find(
    (c) =>
      (c.seolsug && c.seolsug.toLowerCase() === decoded) ||
      (c.id && c.id.toLowerCase() === decoded) ||
      (c.title && c.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') === decoded) ||
      (c.title && c.title.toLowerCase() === decoded)
  );
}

function filterBooksByCategory(category: Category, books: Book[]): Book[] {
  const catTitleLower = category.title.toLowerCase().trim();
  const catIdLower = category.id.toLowerCase().trim();
  const catSlugLower = (category.seolsug || '').toLowerCase().trim();

  return books.filter((b) => {
    const bookCat = (b.category || '').toLowerCase().trim();
    return (
      bookCat === catTitleLower ||
      bookCat === catIdLower ||
      bookCat === catSlugLower ||
      (b.tags && b.tags.some((t) => t.toLowerCase() === catTitleLower))
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
  const desc = category?.seo_description || category?.description || `Explore top competitive exam e-books, study guides, and test papers for ${title} on BooksCircle.`;
  const url = `${SITE_URL}/categories/${encodeURIComponent(slug)}`;

  return {
    title: `${title} PDF E-Books & Study Material | ${SITE_NAME}`,
    description: desc,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} E-Books & Exam Preparation PDF Library`,
      description: desc,
      url: url,
      siteName: SITE_NAME,
      type: 'website',
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
  const categoryDescription = category?.seo_description || category?.description || `Download and read official syllabus-aligned PDF e-books for ${categoryTitle}.`;

  const categoryBooks = category
    ? filterBooksByCategory(category, books)
    : books.filter((b) => b.category?.toLowerCase() === decodeURIComponent(slug).toLowerCase());

  const jsonLd = generateCategorySchema(
    categoryTitle,
    slug,
    categoryDescription,
    categoryBooks.length > 0 ? categoryBooks : books.slice(0, 10)
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
        categoryDescription={categoryDescription}
        books={categoryBooks.length > 0 ? categoryBooks : books}
        allCategories={categories}
      />
    </>
  );
}

