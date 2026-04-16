import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

/**
 * Route-transition loading state for /landlord/contracts/[id].
 *
 * Next.js renders this inside the landlord layout (header + nav still
 * visible) while the page JS chunk is fetching. This replaces the
 * full-page skeleton that previously showed when auth was loading.
 */
export default function ContractDetailLoading() {
  return <LoadingSkeleton count={4} />;
}
