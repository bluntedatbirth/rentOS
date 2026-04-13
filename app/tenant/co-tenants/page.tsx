import { notFound } from 'next/navigation';
import { FEATURE_CO_TENANTS } from '@/lib/features';

export default function CoTenantsPage() {
  if (!FEATURE_CO_TENANTS) notFound();
}
