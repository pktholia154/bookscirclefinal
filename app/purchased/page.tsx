import { redirect } from 'next/navigation';

export default function PurchasedPage() {
  redirect('/?tab=purchased');
}
