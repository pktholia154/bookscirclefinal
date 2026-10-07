import { NextRequest, NextResponse } from 'next/server';
import { getBooksFromFirestore } from '@/lib/services/books';
import { SITE_URL, SITE_NAME, BRAND_NAME } from '@/lib/seo';

// 15-minute in-memory cache
let cachedFeedXml: string | null = null;
let cachedFeedEtag: string | null = null;
let feedCacheExpiresAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const revalidate = 900; // 15 minutes ISR

function escapeCdata(str: string): string {
  return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

function generateEtag(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `W/"rss-${Math.abs(hash)}-${content.length}"`;
}

export async function GET(req: NextRequest) {
  const now = Date.now();
  const ifNoneMatch = req.headers.get('if-none-match');

  // Check valid in-memory cache and ETag
  if (cachedFeedXml && cachedFeedEtag && now < feedCacheExpiresAt) {
    if (ifNoneMatch && ifNoneMatch === cachedFeedEtag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: cachedFeedEtag,
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        },
      });
    }

    return new NextResponse(cachedFeedXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: cachedFeedEtag,
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        'X-Cache-Status': 'HIT',
      },
    });
  }

  try {
    const books = await getBooksFromFirestore();

    // Latest 100 published items ordered DESC
    const sortedBooks = books
      .filter((b) => b.isActive !== false)
      .sort((a, b) => {
        const timeA = a.published_date ? new Date(a.published_date).getTime() : 0;
        const timeB = b.published_date ? new Date(b.published_date).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 100);

    const itemsXml = sortedBooks
      .map((b) => {
        const slug = encodeURIComponent(b.seoslug || b.slug || b.id);
        const bookUrl = `${SITE_URL}/book/${slug}`;
        const pubDate = b.published_date
          ? new Date(b.published_date).toUTCString()
          : new Date().toUTCString();
        const desc = b.seo_description || b.full_description || `${b.title} PDF eBook for competitive exams.`;

        return `    <item>
      <title><![CDATA[${escapeCdata(b.title)}]]></title>
      <link>${bookUrl}</link>
      <guid isPermaLink="true">${bookUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeCdata(desc)}]]></description>
      <category><![CDATA[${escapeCdata(b.category || 'Exam Guides')}]]></category>
      <author>support@exam-kart.com (${BRAND_NAME})</author>
    </item>`;
      })
      .join('\n');

    const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} - Latest E-Books &amp; Exam Guides</title>
    <link>${SITE_URL}</link>
    <description>Latest digital PDF eBooks and competitive exam study materials from ${BRAND_NAME}.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

    const etag = generateEtag(feedXml);
    cachedFeedXml = feedXml;
    cachedFeedEtag = etag;
    feedCacheExpiresAt = now + CACHE_TTL_MS;

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        },
      });
    }

    return new NextResponse(feedXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ETag: etag,
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
        'X-Cache-Status': 'MISS',
      },
    });
  } catch (error) {
    console.error('Fast-discovery feed error:', error);
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>Competitive exam e-books</description>
  </channel>
</rss>`;

    return new NextResponse(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
