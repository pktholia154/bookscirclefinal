import { NextRequest, NextResponse } from 'next/server';
import {
  buildBatchSitemapXml,
  buildLatestSitemapXml,
  generateEtag,
  LATEST_SITEMAP_MAX_URLS,
} from '@/lib/sitemap-helper';

export const revalidate = 900; // 15-minute ISR

interface CachedBatch {
  xml: string;
  etag: string;
  expiresAt: number;
}

const batchCache = new Map<string, CachedBatch>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Dynamic Sitemap Batch & Alias Route Handler:
 * Handles:
 * - /sitemap/0.xml, /sitemap/1.xml, /sitemap/2.xml ... (1,000 URLs per batch)
 * - /sitemap/latest.xml (alias for /sitemap-latest.xml, capped at latest 1,000 URLs)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawParam } = await context.params;
  const cleanId = (rawParam || '0').replace(/\.xml$/i, '').trim().toLowerCase();
  const now = Date.now();
  const ifNoneMatch = req.headers.get('if-none-match');

  const cached = batchCache.get(cleanId);
  if (cached && now < cached.expiresAt) {
    if (ifNoneMatch && ifNoneMatch === cached.etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: cached.etag,
          'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    return new NextResponse(cached.xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: cached.etag,
        'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache-Status': 'HIT',
      },
    });
  }

  let xml: string | null = null;
  if (cleanId === 'latest') {
    xml = await buildLatestSitemapXml(LATEST_SITEMAP_MAX_URLS);
  } else if (/^\d+$/.test(cleanId)) {
    const batchId = parseInt(cleanId, 10);
    xml = await buildBatchSitemapXml(batchId);
  }

  if (!xml) {
    return new NextResponse('Sitemap batch not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const etag = generateEtag(xml);
  batchCache.set(cleanId, {
    xml,
    etag,
    expiresAt: now + CACHE_TTL_MS,
  });

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
