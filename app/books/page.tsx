import { permanentRedirect } from 'next/navigation';

export default function BooksIndexRedirectPage() {
  permanentRedirect('/collection/all');
}
