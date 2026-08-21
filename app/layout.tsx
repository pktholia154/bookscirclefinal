import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'BooksCircle - Buy PDF E-Books & Exam Guides',
  description: 'Digital PDF ebooks marketplace for competitive exams like UPSC, SSC, Engineering, State Exams, IBPS and Banking.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#4029AB',
  openGraph: {
    title: 'BooksCircle - Digital PDF E-Books Marketplace',
    description: 'Instant PDF ebooks for UPSC, SSC, Banking, IBPS, and competitive exams.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="bg-white text-gray-900 antialiased min-h-screen selection:bg-[#4029AB]/10 selection:text-[#4029AB]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

