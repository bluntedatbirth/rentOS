import { redirect } from 'next/navigation';

export default function TenantProfilePage() {
  redirect('/tenant/settings');
}
