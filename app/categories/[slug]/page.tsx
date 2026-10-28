import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoriesRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(`/category/${encodeURIComponent(decodeURIComponent(slug))}`);
}
