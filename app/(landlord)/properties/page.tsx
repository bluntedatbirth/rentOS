'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { PropertyCard } from '@/components/landlord/PropertyCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Property {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
}

export default function PropertiesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [creating, setCreating] = useState(false);

  const supabase = createClient();

  const loadProperties = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('properties')
      .select('id, name, address, unit_number')
      .eq('landlord_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setProperties(data ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    const response = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim() || undefined,
        unit_number: unitNumber.trim() || undefined,
      }),
    });

    if (response.ok) {
      setName('');
      setAddress('');
      setUnitNumber('');
      setShowForm(false);
      await loadProperties();
    }
    setCreating(false);
  };

  if (loading) return <LoadingSkeleton count={3} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('property.title')}</h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? t('common.cancel') : t('property.add')}
        </button>
      </div>

      {/* Add property form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <div>
              <label htmlFor="prop-name" className="mb-1 block text-sm font-medium text-gray-700">
                {t('property.name')}
              </label>
              <input
                id="prop-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('property.name_placeholder')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="prop-address"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t('property.address')}
              </label>
              <input
                id="prop-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('property.address_placeholder')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="prop-unit" className="mb-1 block text-sm font-medium text-gray-700">
                {t('property.unit')}
              </label>
              <input
                id="prop-unit"
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder={t('property.unit_placeholder')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? t('property.creating') : t('property.add')}
            </button>
          </div>
        </form>
      )}

      {/* Properties grid */}
      {properties.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {t('property.no_properties')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} {...p} />
          ))}
        </div>
      )}
    </div>
  );
}
