import { NextRequest, NextResponse } from 'next/server';
import {
  buildLatestSitemapXml,
  generateEtag,
  LATEST_SITEMAP_MAX_URLS,
} from '@/lib/sitemap-helper';

// 15-minute in-memory cache
let cachedSitemapXml: string | null = null;
let cachedSitemapEtag: string | null = null;
let sitemapCacheExpiresAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const dynamic = 'force-dynamic';

/**
 * Rolling Fast-Discovery Sitemap: /sitemap-latest.xml
 * Strictly capped at the latest 1,000 URLs (ordered by most recently published/updated books).
 */
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
          'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600',
        },
      });
    }

    return new NextResponse(cachedSitemapXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: cachedSitemapEtag,
        'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600',
        'X-Cache-Status': 'HIT',
      },
    });
  }

  const xml = await buildLatestSitemapXml(LATEST_SITEMAP_MAX_URLS);
  const etag = generateEtag(xml);

  cachedSitemapXml = xml;
  cachedSitemapEtag = etag;
  sitemapCacheExpiresAt = now + CACHE_TTL_MS;

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  }

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      ETag: etag,
      'Cache-Control': 'public, max-age=900, s-maxage=1800, stale-while-revalidate=3600',
      'X-Cache-Status': 'MISS',
    },
  });
}
