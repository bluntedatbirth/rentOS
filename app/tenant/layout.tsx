'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile || profile.role !== 'tenant') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">{t('auth.unauthorized')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('auth.wrong_role')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/tenant/dashboard" className="text-lg font-bold text-gray-900">
            {t('app.title')}
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              className="min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {locale === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {[
            { href: '/tenant/dashboard', label: t('nav.dashboard') },
            { href: '/tenant/contract/view', label: t('nav.my_contract') },
            { href: '/tenant/maintenance', label: t('nav.maintenance') },
            { href: '/tenant/penalties/appeal', label: t('nav.penalties') },
          ].map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== '/tenant/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`min-h-[44px] whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
