import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { generateWebsiteSchema, SITE_URL, SITE_NAME } from '@/lib/seo';
import { PWARegister } from '@/components/PWARegister';
import { NativePageLoadingProvider } from '@/components/NativePageLoadingIndicator';

const roboto = Roboto({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4029AB' },
    { media: '(prefers-color-scheme: dark)', color: '#4029AB' },
  ],
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
  manifest: '/manifest.json',
  applicationName: 'BooksCircle',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BooksCircle',
  },
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/logo.svg',
        color: '#4029AB',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'theme-color': '#4029AB',
    'msapplication-navbutton-color': '#4029AB',
    'msapplication-TileColor': '#4029AB',
  },
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
        {/* Environment, circular JSON & 3rd-party script safeguard */}
        <script
          id="runtime-safeguards"
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    if (typeof window !== "undefined") {
      // 1. Ensure window.fetch is writable and configurable
      if (window.fetch) {
        var d = Object.getOwnPropertyDescriptor(window, "fetch");
        if (!d || !d.writable || !d.set) {
          var origFetch = window.fetch;
          try {
            Object.defineProperty(window, "fetch", { value: origFetch, writable: true, configurable: true, enumerable: true });
          } catch(e) {
            try {
              var currentFetch = origFetch;
              Object.defineProperty(window, "fetch", {
                get: function() { return currentFetch; },
                set: function(fn) { currentFetch = fn; },
                configurable: true,
                enumerable: true
              });
            } catch(e2) {}
          }
        }
      }

      // 2. Global Circular Structure safeguard for JSON.stringify
      if (typeof JSON !== "undefined" && JSON.stringify) {
        var origStringify = JSON.stringify;
        JSON.stringify = function(value, replacer, space) {
          var seen = new WeakSet();
          function circularSafe(key, val) {
            if (typeof val === "object" && val !== null) {
              if (seen.has(val)) {
                return "[Circular]";
              }
              seen.add(val);
            }
            if (typeof replacer === "function") {
              return replacer.call(this, key, val);
            }
            if (Array.isArray(replacer) && key !== "") {
              if (replacer.indexOf(key) === -1) return undefined;
            }
            return val;
          }
          try {
            return origStringify.call(JSON, value, circularSafe, space);
          } catch (err) {
            try {
              var fallbackSeen = [];
              return origStringify.call(JSON, value, function(k, v) {
                if (typeof v === "object" && v !== null) {
                  if (fallbackSeen.indexOf(v) !== -1) return "[Circular]";
                  fallbackSeen.push(v);
                }
                return v;
              }, space);
            } catch (err2) {
              return '"{}"';
            }
          }
        };
      }

      // 3. Prevent unhandled circular error objects in console
      if (typeof console !== "undefined") {
        ['warn', 'error', 'log'].forEach(function(m) {
          if (console[m]) {
            var origMethod = console[m];
            console[m] = function() {
              var safeArgs = [];
              for (var i = 0; i < arguments.length; i++) {
                var arg = arguments[i];
                if (arg instanceof Error) {
                  safeArgs.push(arg.message || String(arg));
                } else if (typeof arg === "object" && arg !== null) {
                  try {
                    JSON.stringify(arg);
                    safeArgs.push(arg);
                  } catch (e) {
                    safeArgs.push(arg.message || arg.code || "[Object with circular structure]");
                  }
                } else {
                  safeArgs.push(arg);
                }
              }
              origMethod.apply(console, safeArgs);
            };
          }
        });
      }
    }
  } catch(err) {}
})();`,
          }}
        />

        {/* Preconnect & DNS-Prefetch to Razorpay for lightning-fast instant gateway launch */}
        <link rel="preconnect" href="https://checkout.razorpay.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="preconnect" href="https://api.razorpay.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />

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
          <NativePageLoadingProvider>
            <PWARegister />
            {children}
          </NativePageLoadingProvider>
        </div>
      </body>
    </html>
  );
}
