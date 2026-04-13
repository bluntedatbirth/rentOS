'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n/context';

interface PropertyCardProps {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
  contractCount?: number;
}

export function PropertyCard({ id, name, address, unit_number, contractCount }: PropertyCardProps) {
  const { t } = useI18n();

  return (
    <Link href={`/landlord/properties/${id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <h3 className="text-sm font-semibold text-charcoal-900 dark:text-white">{name}</h3>
        {unit_number && (
          <p className="mt-0.5 text-xs text-charcoal-500 dark:text-white/50">
            {t('property.unit')}: {unit_number}
          </p>
        )}
        {address && (
          <p className="mt-1 text-xs text-charcoal-400 line-clamp-2 dark:text-white/40">
            {address}
          </p>
        )}
        {contractCount !== undefined && (
          <p className="mt-2 text-xs text-saffron-600 dark:text-saffron-400">
            {contractCount} {t('property.contracts')}
          </p>
        )}
      </Card>
    </Link>
  );
}
