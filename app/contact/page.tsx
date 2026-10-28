import type { Metadata } from 'next';
import ContactPageClient from '@/components/ContactPageClient';
import { generateContactPageSchema, SITE_URL, SITE_NAME, BRAND_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: `Contact Us & Customer Support | ${BRAND_NAME}`,
  description:
    'Official customer support and contact desk for Exam Kart (Legal entity: Pardeep Kumar) at BooksCircle.org. Get help with PDF e-books, Razorpay orders, and exam study material.',
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    title: `Contact Us & Customer Support | ${BRAND_NAME} - ${SITE_NAME}`,
    description:
      'Get in touch with Exam Kart support desk for digital PDF e-book access, payment verification, and competitive exam guides.',
    url: `${SITE_URL}/contact`,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
  },
};

export default function ContactPage() {
  const contactSchema = generateContactPageSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <ContactPageClient />
    </>
  );
}
