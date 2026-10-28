import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  getBooksFromFirestore,
  getFirestoreBookById,
  slimBookForList,
  fetchBookStructuredPreview,
} from '@/lib/services/books';
import { generateBookSchema, stripMarkdownToPlainText, SITE_URL, SITE_NAME } from '@/lib/seo';
import { BookPageClient } from '@/components/BookPageClient';
import { Book } from '@/lib/types';

export const revalidate = 300; // ISR: revalidate every 5 minutes
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const books = await getBooksFromFirestore();
    return books
      .filter((b) => b && b.isActive !== false && !b.canonicalSlug)
      .slice(0, 20)
      .map((book) => ({
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

  if (!book || (book.isActive === false && !book.canonicalSlug)) {
    return {
      title: 'Book Not Found',
      description: 'The requested exam e-book could not be located in our catalog.',
      robots: { index: false, follow: false },
    };
  }

  const ogTitle = `${book.title} - ${book.category || 'Exam'} PDF eBook | ${SITE_NAME}`;
  const rawDesc =
    book.seo_description ||
    book.seoDescription ||
    book.full_description ||
    `Download ${book.title} PDF eBook for ${book.category || 'Competitive Exams'}. Complete syllabus, study notes, and solved questions with instant delivery.`;
  const bookDesc = stripMarkdownToPlainText(rawDesc);
  const canonicalTargetSlug = book.canonicalSlug || book.seoslug || book.slug || book.id;
  const canonicalUrl = `${SITE_URL}/book/${encodeURIComponent(canonicalTargetSlug)}`;
  const coverUrl = book.cover || `${SITE_URL}/logo.png`;
  const isDuplicateVariant = Boolean(book.canonicalSlug);

  return {
    title: book.title,
    description: bookDesc.slice(0, 160),
    keywords: [
      book.title,
      book.category || 'Exam Guide',
      `${book.category || 'Exam'} PDF`,
      ...(Array.isArray(book.tags) ? book.tags : []),
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    robots: isDuplicateVariant
      ? { index: false, follow: true }
      : {
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
      title: ogTitle,
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
          alt: `${book.title} - ${book.category || 'Exam'} Cover`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: bookDesc,
      images: [coverUrl],
    },
  };
}

export default async function BookSSRPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const book = await getFirestoreBookById(decodedSlug);

  // Return genuine HTTP 404 when book does not exist (eliminates Soft 404s in Google Search Console)
  if (!book || (book.isActive === false && !book.canonicalSlug)) {
    notFound();
  }

  // 301 Redirect duplicate variants, legacy slugs without -bk000xxxx, or raw BK IDs to the single canonical book URL
  const canonicalTargetSlug = book.canonicalSlug || book.seoslug || book.slug || book.id;
  if (canonicalTargetSlug && decodedSlug !== canonicalTargetSlug) {
    permanentRedirect(`/book/${encodeURIComponent(canonicalTargetSlug)}`);
  }

  // Fetch structured book differentiation data (Table of Contents + Sample MCQs)
  const structuredPreview = await fetchBookStructuredPreview(book).catch(() => ({
    tableOfContents: [],
    sampleQuestions: [],
  }));

  const enrichedBook: Book = {
    ...book,
    tableOfContents: structuredPreview.tableOfContents,
    sampleQuestions: structuredPreview.sampleQuestions,
  };

  // Fetch category sibling books for relevant recommendation
  let relatedBooks: Book[] = [];

  try {
    const allBooks = await getBooksFromFirestore();
    const activeBooks = allBooks.filter((b) => b && b.isActive !== false && !b.canonicalSlug);
    const targetCategoryLower = (enrichedBook.category || '').toLowerCase();

    const categoryBooks = activeBooks.filter(
      (b) => (b.category || '').toLowerCase() === targetCategoryLower
    );

    relatedBooks = categoryBooks
      .filter((b) => b.id !== enrichedBook.id)
      .slice(0, 6)
      .map(slimBookForList);
  } catch {}

  // Generate nested JSON-LD schema
  const bookJsonLd = generateBookSchema(enrichedBook);

  return (
    <>
      {/* Dynamic Server-Injected JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />

      {/* Interactive & Accessible Presentation UI */}
      <BookPageClient book={enrichedBook} relatedBooks={relatedBooks} />
    </>
  );
}
