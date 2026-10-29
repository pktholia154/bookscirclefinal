import { permanentRedirect } from 'next/navigation';

export default function BookIndexRedirectPage() {
  permanentRedirect('/collection/all');
}
