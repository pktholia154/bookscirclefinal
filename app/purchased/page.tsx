import type { Metadata } from 'next';
import { PurchasedPageClient } from '@/components/PurchasedPageClient';
import { getBooksFromFirestore, slimBooksForSSR } from '@/lib/services/books';
import { INITIAL_BOOKS } from '@/lib/data';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const revalidate = 300;

export const metadata: Metadata = {
  title: `My Library & Purchased E-Books | ${SITE_NAME}`,
  description:
    'Instant offline and online reading access to all your purchased exam guide PDFs and ePubs, including complimentary test sample material.',
  alternates: {
    canonical: `${SITE_URL}/purchased`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PurchasedPage() {
  let books = INITIAL_BOOKS;
  try {
    const fetched = await getBooksFromFirestore();
    if (fetched && fetched.length > 0) {
      books = fetched;
    }
  } catch {}

  return <PurchasedPageClient initialBooks={slimBooksForSSR(books, 72)} />;
}
