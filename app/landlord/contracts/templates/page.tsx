import { notFound } from 'next/navigation';
import { FEATURE_CONTRACT_GENERATE } from '@/lib/features';

export default function ContractTemplatesPage() {
  if (!FEATURE_CONTRACT_GENERATE) notFound();
}
