import { permanentRedirect } from 'next/navigation';

export default function RefundRedirectPage() {
  permanentRedirect('/refund-policy');
}
