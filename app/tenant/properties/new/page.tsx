'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';

export default function TenantShellPropertyNewPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
      };
      if (address.trim()) body.address = address.trim();
      if (monthlyRent) body.monthly_rent = parseFloat(monthlyRent);
      if (leaseStart) body.lease_start = leaseStart;
      if (leaseEnd) body.lease_end = leaseEnd;
      if (dueDay) body.due_day = parseInt(dueDay, 10);
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch('/api/tenant/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      router.push('/tenant/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-charcoal-900">{t('tenant.add_lease_title')}</h2>
        <p className="mt-1 text-sm text-charcoal-500">{t('tenant.shell_property_subtitle')}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name (required) */}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-charcoal-700">
            {t('tenant.add_lease_property_name')}
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Sukhumvit Condo"
            className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 placeholder-charcoal-300 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
        </div>

        {/* Address (optional) */}
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-charcoal-700">
            {t('property.address')}
            <span className="ml-1 text-xs text-charcoal-400">({t('common.optional')})</span>
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 123 Sukhumvit Rd, Bangkok"
            className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 placeholder-charcoal-300 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
        </div>

        {/* Monthly Rent (optional) */}
        <div>
          <label
            htmlFor="monthly_rent"
            className="mb-1 block text-sm font-medium text-charcoal-700"
          >
            {t('tenant.add_lease_rent')}
            <span className="ml-1 text-xs text-charcoal-400">({t('common.optional')})</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-charcoal-400">
              ฿
            </span>
            <input
              id="monthly_rent"
              type="number"
              min="0"
              step="any"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              placeholder="15000"
              className="w-full rounded-lg border border-warm-200 bg-white py-2.5 pl-7 pr-3 text-sm text-charcoal-900 placeholder-charcoal-300 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
        </div>

        {/* Lease Start / End */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="lease_start"
              className="mb-1 block text-sm font-medium text-charcoal-700"
            >
              {t('tenant.add_lease_start')}
              <span className="ml-1 text-xs text-charcoal-400">({t('common.optional')})</span>
            </label>
            <input
              id="lease_start"
              type="date"
              value={leaseStart}
              onChange={(e) => setLeaseStart(e.target.value)}
              className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
          <div>
            <label htmlFor="lease_end" className="mb-1 block text-sm font-medium text-charcoal-700">
              {t('tenant.add_lease_end')}
              <span className="ml-1 text-xs text-charcoal-400">({t('common.optional')})</span>
            </label>
            <input
              id="lease_end"
              type="date"
              value={leaseEnd}
              onChange={(e) => setLeaseEnd(e.target.value)}
              min={leaseStart || undefined}
              className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
          </div>
        </div>

        {/* Due Day (optional) */}
        <div>
          <label htmlFor="due_day" className="mb-1 block text-sm font-medium text-charcoal-700">
            {t('tenant.add_lease_due_day')}
            <span className="ml-1 text-xs text-charcoal-400">({t('common.optional')})</span>
          </label>
          <input
            id="due_day"
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            placeholder="1–31"
            className="w-full rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 placeholder-charcoal-300 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
        </div>

        {/* Notes (optional) */}
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-charcoal-700">
            {t('tenant.add_lease_notes')}
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any reminders or notes about this lease..."
            className="w-full resize-none rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 placeholder-charcoal-300 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="min-h-[44px] flex-1 rounded-lg border border-warm-200 px-4 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-100 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="min-h-[44px] flex-1 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1 disabled:opacity-50"
          >
            {submitting ? '...' : t('tenant.add_lease_submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
