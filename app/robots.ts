import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/book/',
          '/search',
          '/category/',
          '/sitemap.xml',
          '/sitemap/',
          '/sitemap-latest.xml',
          '/feed.xml',
          '/privacy',
          '/privacy-policy',
          '/terms',
          '/terms-and-conditions',
          '/refund',
          '/refund-policy',
          '/contact',
          '/license',
          '/license-agreement',
        ],
        disallow: ['/api/', '/pdf/', '/account/', '/checkout/'],
      },
      // Explicit AI & Discovery Search Engine Bot Rules
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'Applebot',
          'OAI-SearchBot',
          'GPTBot',
          'PerplexityBot',
          'ClaudeBot',
          'cohere-ai',
          'facebookexternalhit',
          'Twitterbot',
        ],
        allow: [
          '/',
          '/book/',
          '/search',
          '/category/',
          '/sitemap.xml',
          '/sitemap/',
          '/sitemap-latest.xml',
          '/feed.xml',
        ],
        disallow: ['/api/', '/pdf/', '/checkout/'],
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap/0.xml`,
      `${SITE_URL}/sitemap/1.xml`,
      `${SITE_URL}/sitemap-latest.xml`,
    ],
    host: SITE_URL,
  };
}
