import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  getFirestoreBookById,
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
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    let decodedSlug = slug;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch {}

    const book = await getFirestoreBookById(decodedSlug);

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
  } catch (e) {
    console.warn('generateMetadata fallback for book:', e);
    return {
      title: 'Competitive Exam PDF eBook | BooksCircle',
      description: 'Explore verified competitive exam PDF ebooks, study guides, and test papers on BooksCircle.',
      robots: { index: false, follow: true },
    };
  }
}

function isNextControlFlow(err: any): boolean {
  if (!err) return false;
  const digest = String(err.digest || '');
  const msg = String(err.message || '');
  return (
    digest.startsWith('NEXT_REDIRECT') ||
    digest.startsWith('NEXT_NOT_FOUND') ||
    msg.includes('NEXT_REDIRECT') ||
    msg.includes('NEXT_NOT_FOUND')
  );
}

export default async function BookSSRPage({ params }: PageProps) {
  try {
    const { slug } = await params;
    let decodedSlug = slug;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch {}

    let book = await getFirestoreBookById(decodedSlug);

    // Return genuine HTTP 404 when book does not exist (eliminates Soft 404s in Google Search Console)
    if (!book || (book.isActive === false && !book.canonicalSlug)) {
      notFound();
    }

    // 301 Redirect duplicate variants, legacy slugs without -bk000xxxx, or raw BK IDs to the single canonical book URL
    const canonicalTargetSlug = book.canonicalSlug || book.seoslug || book.slug || book.id;
    if (canonicalTargetSlug) {
      const cleanCanonical = canonicalTargetSlug.trim();
      const cleanCurrent = decodedSlug.trim();
      const encodedCanonical = encodeURIComponent(cleanCanonical);

      // Only redirect if genuinely pointing to a different target and not already on the destination
      if (
        cleanCurrent.toLowerCase() !== cleanCanonical.toLowerCase() &&
        slug.toLowerCase() !== encodedCanonical.toLowerCase()
      ) {
        permanentRedirect(`/book/${encodedCanonical}`);
      }
    }

    // Fetch structured book differentiation data (Table of Contents + Sample MCQs)
    let structuredPreview = { tableOfContents: [] as string[], sampleQuestions: [] as any[] };
    try {
      structuredPreview = await fetchBookStructuredPreview(book);
    } catch {}

    const enrichedBook: Book = {
      ...book,
      tableOfContents: structuredPreview.tableOfContents || [],
      sampleQuestions: structuredPreview.sampleQuestions || [],
    };

    // Generate nested JSON-LD schema
    let bookJsonLd: any = null;
    try {
      bookJsonLd = generateBookSchema(enrichedBook);
    } catch (err) {
      console.warn('generateBookSchema warning:', err);
    }

    return (
      <>
        {/* Dynamic Server-Injected JSON-LD Schema */}
        {bookJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
          />
        )}

        {/* Interactive & Accessible Presentation UI */}
        <BookPageClient book={enrichedBook} />
      </>
    );
  } catch (err: any) {
    if (isNextControlFlow(err)) {
      throw err;
    }
    console.error('BookSSRPage server exception caught:', err);
    notFound();
  }
}
