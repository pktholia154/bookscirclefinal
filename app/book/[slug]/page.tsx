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
        <div className="w-16 h-16 rounded-full bg-[#4029AB]/10 text-[#4029AB] flex items-center justify-center">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">E-Book Not Found</h1>
        <p className="text-xs text-gray-500 max-w-sm">
          We could not locate this title in our active catalog. It may have been renamed or archived.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4029AB] text-white text-xs font-bold hover:bg-[#34208e] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Browse All Exam Guides</span>
        </Link>
      </div>
    );
  }

  // Fetch related books in the same category
  let relatedBooks: Book[] = [];
  try {
    const allBooks = await getBooksFromFirestore();
    relatedBooks = allBooks
      .filter((b) => b.id !== book.id && b.category.toLowerCase() === book.category.toLowerCase())
      .slice(0, 6);
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
    </>
  );
}
