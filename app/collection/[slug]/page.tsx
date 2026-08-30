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

const COLLECTION_TITLES: Record<string, { title: string; desc: string }> = {
  trending: {
    title: 'Trending & Popular E-Books',
    desc: 'Most explored and highly read digital preparation books on BooksCircle.',
  },
  'top-rated': {
    title: 'Top Rated Books',
    desc: 'Highest rated study guides and practice question banks reviewed by students.',
  },
  'best-sellers': {
    title: 'Best Sellers',
    desc: 'Top selling exam preparation e-books with proven track record of student success.',
  },
  bestsellers: {
    title: 'Best Sellers',
    desc: 'Top selling exam preparation e-books with proven track record of student success.',
  },
  'new-releases': {
    title: 'New Releases & 2026 Editions',
    desc: 'Latest updated curriculum, recent pattern papers, and newly published notes.',
  },
  'featured-picks': {
    title: 'Featured Editor Picks',
    desc: 'Carefully curated reference books chosen by competitive exam experts.',
  },
  all: {
    title: 'Complete E-Book Library',
    desc: 'Browse our entire catalog of competitive exam prep materials.',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const col = COLLECTION_TITLES[slug.toLowerCase()] || {
    title: decodeURIComponent(slug).replace(/-/g, ' ').toUpperCase(),
    desc: `Browse all books in ${slug} collection on BooksCircle.`,
  };
  const url = `${SITE_URL}/collection/${slug}`;

  return {
    title: `${col.title} | ${SITE_NAME}`,
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

  const colInfo = COLLECTION_TITLES[colKey] || {
    title: decodeURIComponent(slug).replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    desc: `Browse our curated collection of ${slug} books.`,
  };

  let collectionBooks: Book[] = [...books];
  if (colKey === 'trending') {
    collectionBooks.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
  } else if (colKey === 'top-rated') {
    collectionBooks.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (colKey === 'best-sellers' || colKey === 'bestsellers') {
    collectionBooks = collectionBooks.filter((b) => b.is_bestseller || b.badge === 'Bestseller' || (b.rating_count || 0) > 200);
    if (collectionBooks.length === 0) collectionBooks = books;
  }

  const jsonLd = generateCategorySchema(
    colInfo.title,
    slug,
    colInfo.desc,
    collectionBooks
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoryPageClient
        categoryTitle={colInfo.title}
        categorySlug={slug}
        categoryDescription={colInfo.desc}
        books={collectionBooks}
        allCategories={categories}
      />
    </>
  );
}
