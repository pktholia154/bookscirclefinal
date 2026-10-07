import { NextRequest, NextResponse } from 'next/server';
import { getBooksFromFirestore, getCategoriesFromFirestore } from '@/lib/services/books';
import { SITE_URL } from '@/lib/seo';

// 15-minute in-memory cache
let cachedSitemapXml: string | null = null;
let cachedSitemapEtag: string | null = null;
let sitemapCacheExpiresAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const revalidate = 900; // 15 minutes ISR

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateEtag(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `W/"sm-${Math.abs(hash)}-${content.length}"`;
}

export async function GET(req: NextRequest) {
  const now = Date.now();
  const ifNoneMatch = req.headers.get('if-none-match');

  // Check valid in-memory cache and ETag
  if (cachedSitemapXml && cachedSitemapEtag && now < sitemapCacheExpiresAt) {
    if (ifNoneMatch && ifNoneMatch === cachedSitemapEtag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: cachedSitemapEtag,
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        },
      });
    }

    return new NextResponse(cachedSitemapXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: cachedSitemapEtag,
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        'X-Cache-Status': 'HIT',
      },
    });
  }

  try {
    // Query latest published books (up to 3,500 with buffer)
    const [books, categories] = await Promise.all([
      getBooksFromFirestore(),
      getCategoriesFromFirestore().catch(() => []),
    ]);

    const activeBooks = books
      .filter((b) => b.isActive !== false)
      .slice(0, 3500);

    const bookUrlNodes = activeBooks
      .map((b) => {
        const slug = encodeURIComponent(b.seoslug || b.slug || b.id);
        const lastMod = b.published_date
          ? new Date(b.published_date).toISOString()
          : new Date().toISOString();
        return `  <url>
    <loc>${escapeXml(`${SITE_URL}/book/${slug}`)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join('\n');

    const categoryUrlNodes = categories
      .map((c) => {
        const catSlug = encodeURIComponent(c.seolsug || c.id);
        return `  <url>
    <loc>${escapeXml(`${SITE_URL}/?category=${catSlug}`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(SITE_URL)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${escapeXml(`${SITE_URL}/search`)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
${categoryUrlNodes}
${bookUrlNodes}
</urlset>`;

    const etag = generateEtag(xml);
    cachedSitemapXml = xml;
    cachedSitemapEtag = etag;
    sitemapCacheExpiresAt = now + CACHE_TTL_MS;

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        },
      });
    }

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: etag,
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        'X-Cache-Status': 'MISS',
      },
    });
  } catch (error) {
    console.error('Rolling sitemap error:', error);
    // Graceful fallback minimal sitemap
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(SITE_URL)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
