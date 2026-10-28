import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getBooksFromFirestore, getCategoriesFromFirestore, slimBookForList } from '@/lib/services/books';
import { fetchTotalSalesCountMap } from '@/lib/services/purchases';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';
import { Book, Category } from '@/lib/types';
import { generateCategorySchema, SITE_URL, SITE_NAME } from '@/lib/seo';
import { CategoryPageClient } from '@/components/CategoryPageClient';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

const COLLECTION_TITLES: Record<string, { title: string; desc: string; canonicalSlug: string }> = {
  trending: {
    title: 'Trending & Popular E-Books',
    desc: 'Most explored and highly read digital preparation books on BooksCircle.',
    canonicalSlug: 'trending',
  },
  'best-sellers': {
    title: 'Best Sellers',
    desc: 'Top selling exam preparation e-books with proven track record of student success.',
    canonicalSlug: 'bestsellers',
  },
  bestsellers: {
    title: 'Best Sellers',
    desc: 'Top selling exam preparation e-books with proven track record of student success.',
    canonicalSlug: 'bestsellers',
  },
  'new-releases': {
    title: 'New Releases & 2026 Editions',
    desc: 'Latest updated curriculum, recent pattern papers, and newly published notes.',
    canonicalSlug: 'new-releases',
  },
  'featured-picks': {
    title: 'Featured Editor Picks',
    desc: 'Carefully curated reference books chosen by competitive exam experts.',
    canonicalSlug: 'featured-picks',
  },
  all: {
    title: 'Complete E-Book Library',
    desc: 'Browse our entire catalog of competitive exam prep materials.',
    canonicalSlug: 'all',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const col = COLLECTION_TITLES[slug.toLowerCase()];
  if (!col) {
    return {
      title: 'Collection Not Found',
      description: 'The requested e-book collection could not be found.',
      robots: { index: false, follow: false },
    };
  }
  const url = `${SITE_URL}/collection/${col.canonicalSlug}`;

  return {
    title: col.title,
    description: col.desc,
    alternates: { canonical: url },
    openGraph: {
      title: `${col.title} | ${SITE_NAME}`,
      description: col.desc,
      url,
      type: 'website',
    },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const colKey = slug.toLowerCase();
  const colInfo = COLLECTION_TITLES[colKey];

  if (!colInfo) {
    notFound();
  }

  if (slug !== colInfo.canonicalSlug) {
    permanentRedirect(`/collection/${colInfo.canonicalSlug}`);
  }

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

  let collectionBooks: Book[] = [...books];
  if (colKey === 'trending') {
    collectionBooks.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
  } else if (colKey === 'best-sellers' || colKey === 'bestsellers') {
    let salesMap: Record<string, number> = {};
    try {
      salesMap = await fetchTotalSalesCountMap();
    } catch {}

    // Rank strictly according to verified purchases and orders in Firestore
    collectionBooks = collectionBooks
      .map((b) => ({
        ...b,
        sold_count:
          salesMap[b.id] ||
          salesMap[b.slug] ||
          salesMap[b.seoslug || ''] ||
          b.sold_count ||
          0,
      }))
      .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
  }

  const slimmedBooks = collectionBooks.slice(0, 120).map(slimBookForList);

  const jsonLd = generateCategorySchema(
    colInfo.title,
    colInfo.canonicalSlug,
    colInfo.desc,
    slimmedBooks.slice(0, 24),
    '/collection'
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoryPageClient
        categoryTitle={colInfo.title}
        categorySlug={colInfo.canonicalSlug}
        categoryDescription={colInfo.desc}
        books={slimmedBooks}
        allCategories={categories}
      />
    </>
  );
}
