import { NextRequest, NextResponse } from 'next/server';
import { buildSitemapIndexXml, generateEtag } from '@/lib/sitemap-helper';

export const revalidate = 900; // 15-minute ISR

let cachedIndexXml: string | null = null;
let cachedIndexEtag: string | null = null;
let indexCacheExpiresAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Root Sitemap Index Handler: /sitemap.xml
 * Provides search engines (Google Search Console, Bing) with a standard <sitemapindex>
 * dynamically referencing all 1,000-URL sub-sitemaps (/sitemap/0.xml, /sitemap/1.xml, ...)
 * and the fast-discovery rolling sitemap (/sitemap-latest.xml).
 */
export async function GET(req: NextRequest) {
  const now = Date.now();
  const ifNoneMatch = req.headers.get('if-none-match');

  if (cachedIndexXml && cachedIndexEtag && now < indexCacheExpiresAt) {
    if (ifNoneMatch && ifNoneMatch === cachedIndexEtag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: cachedIndexEtag,
          'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    return new NextResponse(cachedIndexXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: cachedIndexEtag,
        'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache-Status': 'HIT',
      },
    });
  }

  const xml = await buildSitemapIndexXml();
  const etag = generateEtag(xml);

  cachedIndexXml = xml;
  cachedIndexEtag = etag;
  indexCacheExpiresAt = now + CACHE_TTL_MS;

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      ETag: etag,
      'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
      'X-Cache-Status': 'MISS',
    },
  });
}
