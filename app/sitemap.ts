import { MetadataRoute } from 'next';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { SITE_URL } from '@/lib/seo';
import { INITIAL_CATEGORIES } from '@/lib/data';

// 1-hour ISR cache for crawler stability
export const revalidate = 3600;

export const BATCH_SIZE = 1000;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/search`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/privacy-policy`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/terms-and-conditions`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/refund-policy`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/contact`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/license-agreement`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    url: `${SITE_URL}/feed.xml`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.5,
  },
];

/**
 * Next.js App Router specification for Sitemap Index splitting:
 * Automatically divides sitemap URLs into discrete batches of 1,000 URLs each.
 * Serving:
 * - /sitemap.xml -> Sitemap Index (<sitemapindex>) referencing each batch
 * - /sitemap/0.xml, /sitemap/1.xml ... -> Sitemaps containing up to 1,000 URLs each
 */
export async function generateSitemaps(): Promise<{ id: number }[]> {
  let bookCount = 0;
  let categoryCount = INITIAL_CATEGORIES.length;

  try {
    const [books, categories] = await Promise.all([
      getBooksFromFirestore().catch(() => []),
      getCategoriesFromFirestore().catch(() => []),
    ]);

    bookCount = books.filter((b) => b.isActive !== false).length;
    if (categories.length > 0) categoryCount = categories.length;
  } catch (e) {
    console.warn('generateSitemaps calculation note:', e);
  }

  const totalUrls = STATIC_ROUTES.length + categoryCount + bookCount;
  const numSitemaps = Math.max(1, Math.ceil(totalUrls / BATCH_SIZE));

  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap(props?: { id?: number | string }): Promise<MetadataRoute.Sitemap> {
  const batchId =
    props?.id !== undefined
      ? typeof props.id === 'number'
        ? props.id
        : parseInt(String(props.id), 10) || 0
      : 0;

  let allRoutes: MetadataRoute.Sitemap = [...STATIC_ROUTES];

  try {
    const [books, categories] = await Promise.all([
      getBooksFromFirestore().catch(() => []),
      getCategoriesFromFirestore().catch(() => []),
    ]);

    const activeCategories = categories.length > 0 ? categories : INITIAL_CATEGORIES;
    const categoryRoutes: MetadataRoute.Sitemap = activeCategories.map((cat) => ({
      url: `${SITE_URL}/category/${encodeURIComponent(cat.seolsug || cat.id)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    const activeBooks = books.filter((b) => b.isActive !== false);
    const bookRoutes: MetadataRoute.Sitemap = activeBooks.map((book) => ({
      url: `${SITE_URL}/book/${encodeURIComponent(book.seoslug || book.slug || book.id)}`,
      lastModified: new Date(book.published_date || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

    allRoutes = [...STATIC_ROUTES, ...categoryRoutes, ...bookRoutes];
  } catch (e) {
    console.warn('Sitemap batch generation note:', e);
  }

  const start = batchId * BATCH_SIZE;
  const end = start + BATCH_SIZE;

  return allRoutes.slice(start, end);
}
