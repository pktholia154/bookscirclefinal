import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BooksRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(`/book/${encodeURIComponent(decodeURIComponent(slug))}`);
}
