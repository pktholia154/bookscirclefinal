import { getFirestoreBookById } from '@/lib/services/books';
import { Book } from '@/lib/types';

export async function fetchFirestoreBookBySlugOrId(idOrSlug: string): Promise<Book | null> {
  return await getFirestoreBookById(idOrSlug);
}
