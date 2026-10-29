import { permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoriesRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {}
  permanentRedirect(`/category/${encodeURIComponent(decoded)}`);
}
