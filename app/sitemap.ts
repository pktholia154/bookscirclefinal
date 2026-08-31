import { MetadataRoute } from 'next';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 0; // Fully dynamic, updates immediately when books are added

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
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
  ];

  let bookRoutes: MetadataRoute.Sitemap = [];
  try {
    const books = await getBooksFromFirestore();
    bookRoutes = books
      .filter((b) => b.isActive !== false)
      .map((book) => ({
        url: `${SITE_URL}/book/${encodeURIComponent(book.id)}`,
        lastModified: new Date(book.published_date || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      }));
  } catch (e) {
    console.warn('Sitemap book generation note:', e);
  }

  return [...staticRoutes, ...bookRoutes];
}
