import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { getBooksFromFirestore, getFirestoreBookById } from '@/lib/services/books';
import { generateBookSchema, SITE_URL, SITE_NAME } from '@/lib/seo';
import { BookPageClient } from '@/components/BookPageClient';
import { Book } from '@/lib/types';

export const revalidate = 60; // ISR: revalidate every 60 seconds
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const books = await getBooksFromFirestore();
    return books.map((book) => ({
      slug: book.seoslug || book.slug || book.id,
    }));
  } catch (error) {
    console.warn('generateStaticParams error:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await getFirestoreBookById(slug);

  if (!book) {
    return {
      title: 'Book Not Found | BooksCircle',
      description: 'The requested exam e-book could not be located in our catalog.',
      robots: { index: false, follow: false },
    };
  }

  const bookTitle = `${book.title} - ${book.category} PDF eBook | BooksCircle`;
  const bookDesc =
    book.seo_description ||
    book.full_description ||
    `Download ${book.title} PDF eBook for ${book.category}. Complete syllabus, study notes, and solved questions with instant delivery.`;
  const canonicalUrl = `${SITE_URL}/book/${encodeURIComponent(book.seoslug || book.slug || book.id)}`;
  const coverUrl = book.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop';

  return {
    title: bookTitle,
    description: bookDesc.slice(0, 160),
    keywords: [
      book.title,
      book.category,
      `${book.category} PDF`,
      'Exam Guide eBook',
      'Study Notes PDF',
      ...(book.tags || []),
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: bookTitle,
      description: bookDesc,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'book',
      images: [
        {
          url: coverUrl,
          width: 800,
          height: 1200,
          alt: `${book.title} - ${book.category} Cover`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: bookTitle,
      description: bookDesc,
      images: [coverUrl],
    },
  };
}

export default async function BookSSRPage({ params }: PageProps) {
  const { slug } = await params;
  const book = await getFirestoreBookById(slug);

  if (!book) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#5e17eb]/10 text-[#5e17eb] flex items-center justify-center">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">E-Book Not Found</h1>
        <p className="text-xs text-gray-500 max-w-sm">
          We could not locate this title in our active catalog. It may have been renamed or archived.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5e17eb] text-white text-xs font-bold hover:bg-[#4d0ec5] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Browse All Exam Guides</span>
        </Link>
      </div>
    );
  }

  // Fetch category sibling books & recent content for Link Loop Crawling
  let relatedBooks: Book[] = [];
  let prevBook: Book | null = null;
  let nextBook: Book | null = null;
  let recentBooks: Book[] = [];

  try {
    const allBooks = await getBooksFromFirestore();
    const activeBooks = allBooks.filter((b) => b.isActive !== false);

    // Sibling links within same category
    const categoryBooks = activeBooks.filter(
      (b) => b.category.toLowerCase() === book.category.toLowerCase()
    );
    const currentIndex = categoryBooks.findIndex((b) => b.id === book.id);
    if (currentIndex > 0) {
      prevBook = categoryBooks[currentIndex - 1];
    } else if (categoryBooks.length > 1) {
      prevBook = categoryBooks[categoryBooks.length - 1];
    }

    if (currentIndex >= 0 && currentIndex < categoryBooks.length - 1) {
      nextBook = categoryBooks[currentIndex + 1];
    } else if (categoryBooks.length > 1) {
      nextBook = categoryBooks[0];
    }

    relatedBooks = categoryBooks.filter((b) => b.id !== book.id).slice(0, 6);

    // Recent Content Strip: Top 10 most recent books across catalog for crawlability
    recentBooks = activeBooks
      .filter((b) => b.id !== book.id)
      .slice(0, 10);
  } catch {}

  // Generate nested JSON-LD schema
  const bookJsonLd = generateBookSchema(book);

  return (
    <>
      {/* Dynamic Server-Injected JSON-LD Schema (Book, Product, Offer, AggregateRating, BreadcrumbList, FAQPage) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />

      {/* Interactive & Accessible Presentation UI */}
      <BookPageClient book={book} relatedBooks={relatedBooks} />

      {/* 4. Link Loop Injection (Bottom of Post Template: Prev/Next Siblings & Recent Strip for Crawler Traversal) */}
      <footer aria-label="Related Guides & Crawl Loop" className="w-full bg-white border-t border-gray-100 px-4 sm:px-6 py-6 pb-20">
        {/* Sibling Links in Same Category */}
        {(prevBook || nextBook) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {prevBook && prevBook.id !== book.id && (
              <a
                href={`/book/${encodeURIComponent(prevBook.seoslug || prevBook.slug || prevBook.id)}`}
                className="flex flex-col p-3 rounded-xl border border-gray-200 hover:border-[#4029AB] hover:bg-[#4029AB]/[0.02] transition-colors group"
              >
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#4029AB] uppercase tracking-wider mb-0.5">
                  ← Previous in {book.category}
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#4029AB] line-clamp-1">
                  {prevBook.title}
                </span>
              </a>
            )}
            {nextBook && nextBook.id !== book.id && (
              <a
                href={`/book/${encodeURIComponent(nextBook.seoslug || nextBook.slug || nextBook.id)}`}
                className="flex flex-col p-3 rounded-xl border border-gray-200 hover:border-[#4029AB] hover:bg-[#4029AB]/[0.02] transition-colors sm:text-right group"
              >
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#4029AB] uppercase tracking-wider mb-0.5">
                  Next in {book.category} →
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#4029AB] line-clamp-1">
                  {nextBook.title}
                </span>
              </a>
            )}
          </div>
        )}

        {/* Recent Content Plain Anchor Strip */}
        {recentBooks.length > 0 && (
          <aside className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center justify-between">
              <span>Recent Exam Notes &amp; PDF Guides</span>
              <span className="text-[10px] font-normal text-gray-400">Direct Links</span>
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {recentBooks.map((rb) => (
                <li key={rb.id} className="truncate">
                  <a
                    href={`/book/${encodeURIComponent(rb.seoslug || rb.slug || rb.id)}`}
                    className="text-gray-700 hover:text-[#4029AB] hover:underline font-medium"
                    title={rb.title}
                  >
                    • {rb.title}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </footer>
    </>
  );
}
