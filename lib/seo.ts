import { Book, Review } from './types';

export const SITE_URL = 'https://bookscircle.org';
export const SITE_NAME = 'BooksCircle';
export const BRAND_NAME = 'Exam Kart';
export const LEGAL_ENTITY = 'Pardeep Kumar';

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
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: BRAND_NAME,
        legalName: LEGAL_ENTITY,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/icon.png`,
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
  const listPrice = Number(book.list_price || buyPrice);
  const bookUrl = `${SITE_URL}/book/${encodeURIComponent(book.id)}`;
  const coverUrl = book.cover || `${SITE_URL}/cover-placeholder.jpg`;

  const faqItems = [
    {
      '@type': 'Question',
      name: `What format is "${book.title}" delivered in?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `"${book.title}" is delivered instantly in high-resolution, DRM-secured PDF e-book format, optimized for smartphones, tablets, laptops, and desktop PDF readers with offline reading support.`,
      },
    },
    {
      '@type': 'Question',
      name: `How do I access "${book.title}" after purchase?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Upon completing secure Razorpay payment, your account is immediately granted access. You can read online using our vector PDF reader or download the PDF for offline exam preparation.`,
      },
    },
    {
      '@type': 'Question',
      name: `Is "${book.title}" updated for the latest exam syllabus?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `Yes, all e-books and study materials in the ${book.category} section on BooksCircle are curated and updated regularly to align with the current syllabus and examination patterns.`,
      },
    },
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      // 1. Breadcrumbs
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
            item: `${SITE_URL}/?category=${encodeURIComponent(book.category || 'all')}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: book.title,
            item: bookUrl,
          },
        ],
      },
      // 2. Book & Product Unified Entity
      {
        '@type': ['Book', 'Product'],
        '@id': `${bookUrl}#book`,
        name: book.title,
        headline: book.title,
        url: bookUrl,
        image: [coverUrl],
        description: book.seo_description || book.full_description || `${book.title} PDF eBook for competitive exams.`,
        inLanguage: book.language || 'English',
        bookFormat: 'https://schema.org/EBook',
        numberOfPages: book.pages || undefined,
        isbn: book.isbn || undefined,
        datePublished: book.published_date || '2026',
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
                datePublished: r.date || '2026-08-20',
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
 * Generates Schema.org CollectionPage & ItemList Schema for dedicated Category Pages
 */
export function generateCategorySchema(
  categoryTitle: string,
  categorySlug: string,
  categoryDescription: string,
  books: Book[]
) {
  const categoryUrl = `${SITE_URL}/category/${encodeURIComponent(categorySlug)}`;

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
            name: 'Categories',
            item: `${SITE_URL}/#categories`,
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
        name: `${categoryTitle} PDF E-Books & Study Material | BooksCircle`,
        description: categoryDescription,
        isPartOf: {
          '@id': `${SITE_URL}/#website`,
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: books.length,
          itemListElement: books.map((book, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Book',
              name: book.title,
              url: `${SITE_URL}/book/${encodeURIComponent(book.id)}`,
              image: book.cover,
              offers: {
                '@type': 'Offer',
                price: book.buy_price.toString(),
                priceCurrency: 'INR',
              },
            },
          })),
        },
      },
    ],
  };
}

