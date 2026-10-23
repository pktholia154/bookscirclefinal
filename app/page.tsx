import type { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';
import { generateHomePageSchema, SITE_URL, SITE_NAME } from '@/lib/seo';

export const revalidate = 300; // 5-minute ISR for fast edge response + fresh catalog

export const metadata: Metadata = {
  title: 'BooksCircle - Buy PDF E-Books & Competitive Exam Guides',
  description:
    'Digital PDF ebooks marketplace for competitive exams like UPSC, SSC, Engineering, State Exams, CUET PG, IBPS and Banking with instant vector preview and secure download.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'BooksCircle - Digital PDF E-Books Marketplace',
    description:
      'Instant PDF ebooks for UPSC, SSC, Banking, IBPS, CUET PG, and competitive exams with vector PDF reader and 1-click checkout.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
  },
};

export default async function Page() {
  let books = INITIAL_BOOKS;
  let categories = INITIAL_CATEGORIES;

  try {
    const [fetchedBooks, fetchedCategories] = await Promise.all([
      getBooksFromFirestore().catch(() => INITIAL_BOOKS),
      getCategoriesFromFirestore().catch(() => INITIAL_CATEGORIES),
    ]);

    if (fetchedBooks && fetchedBooks.length > 0) {
      books = fetchedBooks;
    }
    if (fetchedCategories && fetchedCategories.length > 0) {
      categories = fetchedCategories;
    }
  } catch {}

  const homeSchema = generateHomePageSchema(books, categories);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />
      <HomePageClient initialBooks={books} initialCategories={categories} />
    </>
  );
}
