import type { Metadata } from 'next';
import SearchPageClient from '@/components/SearchPageClient';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Search Competitive Exam PDF E-Books & Study Material | ${SITE_NAME}`,
  description:
    'Search across 1,800+ competitive exam PDF e-books, solved question banks, and study guides for UPSC, SSC, Banking, CUET PG, Engineering, and State PSC exams on BooksCircle.',
  alternates: {
    canonical: `${SITE_URL}/search`,
  },
  openGraph: {
    title: `Search Exam PDF E-Books | ${SITE_NAME}`,
    description:
      'Search and preview competitive exam PDF e-books, question banks, and study notes on BooksCircle.',
    url: `${SITE_URL}/search`,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
  },
};

export default async function SearchRoutePage() {
  let books = INITIAL_BOOKS;
  let categories = INITIAL_CATEGORIES;

  try {
    const [fetchedBooks, fetchedCategories] = await Promise.all([
      getBooksFromFirestore().catch(() => INITIAL_BOOKS),
      getCategoriesFromFirestore().catch(() => INITIAL_CATEGORIES),
    ]);
    if (fetchedBooks && fetchedBooks.length > 0) books = fetchedBooks;
    if (fetchedCategories && fetchedCategories.length > 0) categories = fetchedCategories;
  } catch {}

  return <SearchPageClient initialBooks={books} initialCategories={categories} />;
}
