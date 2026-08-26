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
        allow: ['/', '/book/', '/search'],
        disallow: ['/api/', '/pdf/', '/checkout/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
