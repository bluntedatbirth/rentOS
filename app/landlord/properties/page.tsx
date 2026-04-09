'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { PropertyCard } from '@/components/landlord/PropertyCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useProGate } from '@/lib/hooks/useProGate';

const FREE_PROPERTY_LIMIT = 3;
const supabase = createClient();

interface Property {
  id: string;
  name: string;
  address: string | null;
  unit_number: string | null;
}

export default function PropertiesPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { gate, PromptModal } = useProGate('unlimited_properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [creating, setCreating] = useState(false);

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
  }, [user]);

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

  const isAtFreeLimit =
    (profile?.tier ?? 'free') === 'free' && properties.length >= FREE_PROPERTY_LIMIT;

  if (loading) return <LoadingSkeleton count={3} />;

  return (
    <div className="mx-auto max-w-3xl">
      {PromptModal}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('property.title')}</h2>
        <button
          type="button"
          onClick={() => {
            if (isAtFreeLimit) {
              gate(() => setShowForm(!showForm));
            } else {
              setShowForm(!showForm);
            }
          }}
          className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showForm ? t('common.cancel') : t('property.add')}
        </button>
      </div>

      {/* Add property form */}
      {showForm && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          {/* Quick contract options */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/landlord/contracts/create"
              className="flex flex-1 items-center gap-3 rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-4 transition-colors hover:border-green-400 hover:bg-green-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-8 w-8 shrink-0 text-green-500"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm4.75 6.75a.75.75 0 00-1.5 0v2.25H5.5a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25h2.25a.75.75 0 000-1.5h-2.25V8.75z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  {t('property.create_contract_option')}
                </p>
                <p className="text-xs text-green-600">{t('property.create_contract_hint')}</p>
              </div>
            </Link>
            <Link
              href="/landlord/contracts/upload"
              className="flex flex-1 items-center gap-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-8 w-8 shrink-0 text-blue-500"
              >
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  {t('property.upload_contract_option')}
                </p>
                <p className="text-xs text-blue-600">{t('property.upload_contract_hint')}</p>
              </div>
            </Link>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">{t('property.or_manual')}</span>
            </div>
          </div>

          <form onSubmit={handleCreate}>
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
        </div>
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
