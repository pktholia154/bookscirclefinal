import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { generateWebsiteSchema, SITE_URL, SITE_NAME } from '@/lib/seo';

const roboto = Roboto({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4029AB',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BooksCircle - Buy PDF E-Books & Exam Guides',
    template: '%s | BooksCircle',
  },
  description:
    'Digital PDF ebooks marketplace for competitive exams like UPSC, SSC, Engineering, State Exams, IBPS and Banking with instant vector preview and secure download.',
  keywords: [
    'PDF eBooks',
    'Exam Guides',
    'UPSC Study Material',
    'SSC Exam PDF',
    'Banking Exam Books',
    'Engineering Competitive Exams',
    'BooksCircle',
    'Exam Kart',
  ],
  authors: [{ name: 'Exam Kart Editorial Board', url: SITE_URL }],
  creator: 'Pardeep Kumar',
  publisher: 'Exam Kart',
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'BooksCircle - Digital PDF E-Books Marketplace',
    description:
      'Instant PDF ebooks for UPSC, SSC, Banking, IBPS, and competitive exams with vector PDF reader and 1-click checkout.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
        alt: 'BooksCircle - Competitive Exam PDF eBooks Catalog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BooksCircle - Buy PDF E-Books & Exam Guides',
    description:
      'Instant PDF ebooks for UPSC, SSC, Banking, IBPS, and competitive exams with vector PDF reader.',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop'],
    creator: '@bookscircle',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteSchema = generateWebsiteSchema();

  return (
    <html lang="en" className={roboto.variable}>
      <head>
        {/* Injected Organization & WebSite JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className="bg-neutral-100/80 sm:bg-slate-100/70 text-gray-900 antialiased min-h-screen selection:bg-[#4029AB]/10 selection:text-[#4029AB] flex flex-col items-center justify-start"
        suppressHydrationWarning
      >
        {/* Standard Boxed Limits Container for PC/Desktop screens */}
        <div className="w-full max-w-2xl lg:max-w-3xl min-h-screen bg-white md:shadow-2xl md:shadow-gray-300/40 md:border-x md:border-gray-200/80 flex flex-col relative">
          {children}
        </div>
      </body>
    </html>
  );
}
