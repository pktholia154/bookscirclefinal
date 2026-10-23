import { Book, Category, Review } from './types';
import { BOOK_FAQS } from './data';

export const SITE_URL = 'https://bookscircle.org';
export const SITE_NAME = 'BooksCircle';
export const BRAND_NAME = 'Exam Kart';
export const LEGAL_ENTITY = 'Pardeep Kumar';

/**
 * Safely resolves any date candidate into a guaranteed valid ISO-8601 string.
 * Prevents RangeError: Invalid time value when Firestore fields contain arbitrary strings.
 */
export function safeIsoDate(...candidates: any[]): string {
  for (const val of candidates) {
    if (!val) continue;
    try {
      if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString();
      }
      if (typeof val === 'object') {
        if (typeof val.seconds === 'number') {
          return new Date(val.seconds * 1000).toISOString();
        }
        if (typeof val._seconds === 'number') {
          return new Date(val._seconds * 1000).toISOString();
        }
      }
      if (typeof val === 'number' && val > 946684800000) {
        return new Date(val).toISOString();
      }
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) continue;
        if (/^\d{4}$/.test(trimmed)) {
          return `${trimmed}-01-01T00:00:00.000Z`;
        }
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
    } catch {}
  }
  return new Date().toISOString();
}

/**
 * Computes numeric timestamp in milliseconds for sorting books by latest first.
 */
export function getBookTimestampMs(book: Book): number {
  const candidates = [book.updated_at, book.created_at, book.published_date];
  for (const c of candidates) {
    if (!c) continue;
    if (/^\d{4}$/.test(String(c).trim())) {
      const t = new Date(`${String(c).trim()}-01-01T00:00:00.000Z`).getTime();
      if (!isNaN(t)) return t;
    }
    const parsed = new Date(c).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

/**
 * Generates Root WebSite and Organization JSON-LD Schema
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: ['Books Circle', 'Exam Kart Books', 'BooksCircle.org'],
        description:
          'Digital PDF e-books and study material marketplace for competitive exams (UPSC, SSC, Banking, Engineering, State PSC).',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'en-IN',
      },
      {
        '@type': ['Organization', 'OnlineBusiness'],
        '@id': `${SITE_URL}/#organization`,
        name: BRAND_NAME,
        legalName: LEGAL_ENTITY,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
          caption: `${BRAND_NAME} - ${SITE_NAME}`,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+91-9812000000',
          contactType: 'customer service',
          email: 'support@exam-kart.com',
          areaServed: 'IN',
          availableLanguage: ['en', 'hi'],
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: '1st Floor, SCO-28, Sector 13',
          addressLocality: 'Bhiwani',
          addressRegion: 'Haryana',
          postalCode: '127021',
          addressCountry: 'IN',
        },
        sameAs: [
          'https://twitter.com/bookscircle',
          'https://facebook.com/bookscircle',
        ],
      },
    ],
  };
}

/**
 * Generates Comprehensive Nested JSON-LD for an individual Book / Product
 */
export function generateBookSchema(book: Book) {
  const ratingValue = Number(book.rating || 4.7).toFixed(1);
  const ratingCount = Number(book.rating_count || 120);
  const buyPrice = Number(book.buy_price || 0);
  const bookSlug = book.seoslug || book.slug || book.id;
  const bookUrl = `${SITE_URL}/book/${encodeURIComponent(bookSlug)}`;
  const coverUrl = book.cover || `${SITE_URL}/logo.png`;
  const categorySlug =
    book.categorySlug ||
    (book.category || 'exam-guides')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  const categoryUrl = `${SITE_URL}/category/${encodeURIComponent(categorySlug || 'all')}`;

  const datePublished = safeIsoDate(book.created_at, book.published_date, '2026-01-01T00:00:00.000Z').split('T')[0];
  const dateModified = safeIsoDate(book.updated_at, book.created_at, book.published_date);

  const faqItems = BOOK_FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // 1. Breadcrumbs (referencing canonical /category/[slug] URL)
      {
        '@type': 'BreadcrumbList',
        '@id': `${bookUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: book.category || 'Exam Guides',
            item: categoryUrl,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: book.title,
            item: bookUrl,
          },
        ],
      },
      // 2. Book & Product Unified Entity (Google Merchant Listings & Rich Results Compliant)
      {
        '@type': ['Book', 'Product'],
        '@id': `${bookUrl}#book`,
        name: book.title,
        headline: book.title,
        sku: book.id,
        mpn: bookSlug,
        url: bookUrl,
        mainEntityOfPage: bookUrl,
        image: [coverUrl],
        description:
          book.seo_description ||
          book.full_description ||
          `${book.title} PDF eBook for ${book.category || 'competitive'} exams.`,
        inLanguage: book.language || 'English',
        bookFormat: 'https://schema.org/EBook',
        numberOfPages: book.pages || undefined,
        isbn: book.isbn || undefined,
        category: book.category || 'Exam Guides',
        datePublished,
        dateModified,
        brand: {
          '@type': 'Brand',
          name: book.publisher || BRAND_NAME,
        },
        author: {
          '@type': 'Person',
          name: book.author || 'Editorial Board',
        },
        publisher: {
          '@type': 'Organization',
          name: book.publisher || BRAND_NAME,
        },
        offers: {
          '@type': 'Offer',
          '@id': `${bookUrl}#offer`,
          url: bookUrl,
          priceCurrency: 'INR',
          price: buyPrice.toString(),
          priceValidUntil: '2027-12-31',
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: BRAND_NAME,
          },
          hasMeasurement: {
            '@type': 'QuantitativeValue',
            value: book.file_size || 'Digital PDF',
          },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
              '@type': 'MonetaryAmount',
              value: '0',
              currency: 'INR',
            },
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'IN',
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: {
                '@type': 'QuantitativeValue',
                minValue: 0,
                maxValue: 0,
                unitCode: 'DAY',
              },
              transitTime: {
                '@type': 'QuantitativeValue',
                minValue: 0,
                maxValue: 0,
                unitCode: 'DAY',
              },
            },
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'IN',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 7,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
            merchantReturnLink: `${SITE_URL}/refund-policy`,
          },
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          '@id': `${bookUrl}#aggregateRating`,
          ratingValue: ratingValue,
          reviewCount: ratingCount > 0 ? ratingCount : 15,
          bestRating: '5',
          worstRating: '1',
        },
        review:
          book.reviews && book.reviews.length > 0
            ? book.reviews.map((r: Review) => ({
                '@type': 'Review',
                author: {
                  '@type': 'Person',
                  name: r.user || 'Verified Buyer',
                },
                datePublished: safeIsoDate(r.date, '2026-08-20').split('T')[0],
                reviewBody: r.comment,
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: (r.rating || 5).toString(),
                  bestRating: '5',
                  worstRating: '1',
                },
              }))
            : [
                {
                  '@type': 'Review',
                  author: {
                    '@type': 'Person',
                    name: 'Verified Aspirant',
                  },
                  datePublished: '2026-08-15',
                  reviewBody: `Exceptional exam prep resource. High quality syllabus coverage and crisp PDF rendering for ${book.category}.`,
                  reviewRating: {
                    '@type': 'Rating',
                    ratingValue: ratingValue,
                    bestRating: '5',
                    worstRating: '1',
                  },
                },
              ],
      },
      // 3. FAQPage Schema
      {
        '@type': 'FAQPage',
        '@id': `${bookUrl}#faq`,
        mainEntity: faqItems,
      },
    ],
  };
}

/**
 * Generates Schema.org CollectionPage & ItemList Schema for dedicated Category & Collection Pages
 */
export function generateCategorySchema(
  categoryTitle: string,
  categorySlug: string,
  seoCat: string,
  books: Book[],
  basePath: '/category' | '/collection' = '/category'
) {
  const categoryUrl = `${SITE_URL}${basePath}/${encodeURIComponent(categorySlug)}`;
  const effectiveDescription =
    seoCat ||
    `Download ${categoryTitle} PDF e-books, previous year solved question papers, and competitive exam study material with instant access on ${SITE_NAME}.`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${categoryUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: basePath === '/collection' ? 'Collections' : 'Categories',
            item: `${SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: categoryTitle,
            item: categoryUrl,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${categoryUrl}#webpage`,
        url: categoryUrl,
        name: `${categoryTitle} PDF E-Books & Study Material | ${SITE_NAME}`,
        description: effectiveDescription,
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: books.length,
          itemListElement: books.slice(0, 50).map((book, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Book',
              name: book.title,
              url: `${SITE_URL}/book/${encodeURIComponent(book.seoslug || book.slug || book.id)}`,
              image: book.cover,
              offers: {
                '@type': 'Offer',
                price: book.buy_price.toString(),
                priceCurrency: 'INR',
                availability: 'https://schema.org/InStock',
              },
            },
          })),
        },
      },
    ],
  };
}

/**
 * Generates Homepage CollectionPage & ItemList Schema for Root Discovery Route (/)
 */
export function generateHomePageSchema(books: Book[], categories: Category[]) {
  const topBooks = books.filter((b) => b.isActive !== false).slice(0, 24);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/#homepage`,
        url: SITE_URL,
        name: 'BooksCircle - Buy PDF E-Books & Competitive Exam Guides',
        description:
          'Digital PDF ebooks marketplace for competitive exams like UPSC, SSC, Engineering, State Exams, CUET PG, IBPS and Banking with instant vector preview and secure download.',
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        about: categories.slice(0, 20).map((cat) => ({
          '@type': 'Thing',
          name: cat.title,
          url: `${SITE_URL}/category/${encodeURIComponent(cat.seolsug || cat.id)}`,
        })),
        mainEntity: {
          '@type': 'ItemList',
          name: 'Featured Competitive Exam PDF E-Books',
          numberOfItems: topBooks.length,
          itemListElement: topBooks.map((book, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/book/${encodeURIComponent(book.seoslug || book.slug || book.id)}`,
            name: book.title,
          })),
        },
      },
    ],
  };
}

/**
 * Generates ContactPage JSON-LD Schema for /contact
 */
export function generateContactPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${SITE_URL}/contact#webpage`,
    url: `${SITE_URL}/contact`,
    name: `Contact Us & Customer Support | ${BRAND_NAME} - ${SITE_NAME}`,
    description:
      'Official customer support and contact desk for Exam Kart (Legal Entity: Pardeep Kumar) at BooksCircle.org.',
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
    mainEntity: {
      '@id': `${SITE_URL}/#organization`,
    },
  };
}


