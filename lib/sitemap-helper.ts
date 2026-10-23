import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { SITE_URL, safeIsoDate, getBookTimestampMs } from '@/lib/seo';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from '@/lib/data';

export const SITEMAP_BATCH_SIZE = 1000;
export const LATEST_SITEMAP_MAX_URLS = 1000;

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

export function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateEtag(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `W/"sm-${Math.abs(hash)}-${content.length}"`;
}

export function renderUrlsetXml(entries: SitemapUrlEntry[]): string {
  const urlNodes = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
}

function deduplicateEntries(entries: SitemapUrlEntry[]): SitemapUrlEntry[] {
  const seen = new Set<string>();
  const result: SitemapUrlEntry[] = [];
  for (const item of entries) {
    const normalized = item.loc.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(item);
  }
  return result;
}

export function getStaticSitemapEntries(nowIso: string): SitemapUrlEntry[] {
  return [
    {
      loc: SITE_URL,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${SITE_URL}/search`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${SITE_URL}/collection/trending`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${SITE_URL}/collection/bestsellers`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${SITE_URL}/collection/top-rated`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${SITE_URL}/collection/new-releases`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${SITE_URL}/collection/featured-picks`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${SITE_URL}/collection/all`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '0.8',
    },
    {
      loc: `${SITE_URL}/privacy-policy`,
      lastmod: nowIso,
      changefreq: 'monthly',
      priority: '0.5',
    },
    {
      loc: `${SITE_URL}/terms-and-conditions`,
      lastmod: nowIso,
      changefreq: 'monthly',
      priority: '0.5',
    },
    {
      loc: `${SITE_URL}/refund-policy`,
      lastmod: nowIso,
      changefreq: 'monthly',
      priority: '0.5',
    },
    {
      loc: `${SITE_URL}/contact`,
      lastmod: nowIso,
      changefreq: 'monthly',
      priority: '0.5',
    },
    {
      loc: `${SITE_URL}/license-agreement`,
      lastmod: nowIso,
      changefreq: 'monthly',
      priority: '0.4',
    },
  ];
}

/**
 * Fetches and builds all deduplicated catalog sitemap entries for paginated sitemaps (/sitemap/0.xml, /sitemap/1.xml, etc.)
 */
export async function getAllCatalogSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const nowIso = new Date().toISOString();
  const staticEntries = getStaticSitemapEntries(nowIso);

  try {
    const [books, categories] = await Promise.all([
      getBooksFromFirestore().catch(() => INITIAL_BOOKS),
      getCategoriesFromFirestore().catch(() => INITIAL_CATEGORIES),
    ]);

    const activeCategories = categories && categories.length > 0 ? categories : INITIAL_CATEGORIES;
    const categoryEntries: SitemapUrlEntry[] = activeCategories.map((cat) => {
      const catSlug = encodeURIComponent(cat.seolsug || cat.id);
      return {
        loc: `${SITE_URL}/category/${catSlug}`,
        lastmod: nowIso,
        changefreq: 'daily',
        priority: '0.8',
      };
    });

    const rawBooks = books && books.length > 0 ? books : INITIAL_BOOKS;
    const activeBooks = rawBooks.filter((b) => b.isActive !== false);

    const bookEntries: SitemapUrlEntry[] = activeBooks.map((b) => {
      const slug = encodeURIComponent(b.seoslug || b.slug || b.id);
      const lastmod = safeIsoDate(b.updated_at, b.created_at, b.published_date, nowIso);
      return {
        loc: `${SITE_URL}/book/${slug}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.9',
      };
    });

    return deduplicateEntries([...staticEntries, ...categoryEntries, ...bookEntries]);
  } catch (err) {
    console.warn('getAllCatalogSitemapEntries fallback:', err);
    return staticEntries;
  }
}

/**
 * Builds the rolling latest sitemap XML strictly capped at LATEST_SITEMAP_MAX_URLS (1,000 URLs).
 * Ordered by most recently updated/published books descending.
 */
export async function buildLatestSitemapXml(maxUrls: number = LATEST_SITEMAP_MAX_URLS): Promise<string> {
  const nowIso = new Date().toISOString();

  try {
    const [books, categories] = await Promise.all([
      getBooksFromFirestore().catch(() => INITIAL_BOOKS),
      getCategoriesFromFirestore().catch(() => INITIAL_CATEGORIES),
    ]);

    const rawBooks = books && books.length > 0 ? books : INITIAL_BOOKS;
    const activeBooks = rawBooks.filter((b) => b.isActive !== false);

    // Sort active books by latest timestamp descending (preserving reverse insertion order on ties)
    const indexedBooks = activeBooks.map((book, index) => ({
      book,
      index,
      timestamp: getBookTimestampMs(book),
    }));

    indexedBooks.sort((a, b) => {
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return b.index - a.index;
    });

    const coreDiscoveryEntries: SitemapUrlEntry[] = [
      {
        loc: SITE_URL,
        lastmod: nowIso,
        changefreq: 'daily',
        priority: '1.0',
      },
      {
        loc: `${SITE_URL}/search`,
        lastmod: nowIso,
        changefreq: 'daily',
        priority: '0.8',
      },
    ];

    const activeCategories = categories && categories.length > 0 ? categories : INITIAL_CATEGORIES;
    const categoryEntries: SitemapUrlEntry[] = activeCategories.map((c) => {
      const catSlug = encodeURIComponent(c.seolsug || c.id);
      return {
        loc: `${SITE_URL}/category/${catSlug}`,
        lastmod: nowIso,
        changefreq: 'daily',
        priority: '0.8',
      };
    });

    const bookEntries: SitemapUrlEntry[] = indexedBooks.map(({ book: b }) => {
      const slug = encodeURIComponent(b.seoslug || b.slug || b.id);
      const lastmod = safeIsoDate(b.updated_at, b.created_at, b.published_date, nowIso);
      return {
        loc: `${SITE_URL}/book/${slug}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.9',
      };
    });

    // Combine and strictly cap at maxUrls (1,000 URLs max)
    const combined = deduplicateEntries([
      ...coreDiscoveryEntries,
      ...categoryEntries,
      ...bookEntries,
    ]).slice(0, maxUrls);

    return renderUrlsetXml(combined);
  } catch (err) {
    console.error('buildLatestSitemapXml error:', err);
    return renderUrlsetXml([
      {
        loc: SITE_URL,
        lastmod: nowIso,
        changefreq: 'daily',
        priority: '1.0',
      },
    ]);
  }
}

/**
 * Builds a specific batch sitemap XML (/sitemap/0.xml, /sitemap/1.xml, etc.) with up to 1,000 URLs per batch.
 */
export async function buildBatchSitemapXml(batchId: number): Promise<string> {
  const allEntries = await getAllCatalogSitemapEntries();
  const safeBatch = Math.max(0, batchId);
  const start = safeBatch * SITEMAP_BATCH_SIZE;
  const end = start + SITEMAP_BATCH_SIZE;
  let sliced = allEntries.slice(start, end);

  // Guarantee non-empty valid XML even if a higher batch index is requested during cache warm-up
  if (sliced.length === 0 && allEntries.length > 0) {
    sliced = allEntries.slice(Math.max(0, allEntries.length - Math.min(200, allEntries.length)));
  }

  return renderUrlsetXml(sliced);
}

/**
 * Builds the root Sitemap Index XML (/sitemap.xml) referencing all active 1,000-URL batches and /sitemap-latest.xml.
 */
export async function buildSitemapIndexXml(): Promise<string> {
  const nowIso = new Date().toISOString();
  const allEntries = await getAllCatalogSitemapEntries();
  const numBatches = Math.max(2, Math.ceil(allEntries.length / SITEMAP_BATCH_SIZE));

  const batchNodes = Array.from({ length: numBatches }, (_, i) => {
    return `  <sitemap>
    <loc>${escapeXml(`${SITE_URL}/sitemap/${i}.xml`)}</loc>
    <lastmod>${nowIso}</lastmod>
  </sitemap>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${batchNodes}
  <sitemap>
    <loc>${escapeXml(`${SITE_URL}/sitemap-latest.xml`)}</loc>
    <lastmod>${nowIso}</lastmod>
  </sitemap>
</sitemapindex>`;
}
