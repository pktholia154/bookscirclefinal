import { permanentRedirect } from 'next/navigation';

export default function LicenseRedirectPage() {
  permanentRedirect('/license-agreement');
}
