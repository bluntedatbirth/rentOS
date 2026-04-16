'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { useContractParse } from '@/components/providers/ContractParseProvider';
import { BottomNav, type NavItem } from '@/components/ui/BottomNav';
import { SideNav, type SideNavItem } from '@/components/ui/SideNav';

const SimulationPanel =
  process.env.NEXT_PUBLIC_BETA_SIMULATIONS === 'true'
    ? dynamic(
        () =>
          import('@/components/beta/SimulationPanel').then((m) => ({
            default: m.SimulationPanel,
          })),
        { ssr: false }
      )
    : () => null;

const LANDLORD_ROOT_TABS = ['/landlord/properties', '/landlord/settings'];

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { activeJob } = useContractParse();
  const router = useRouter();
  const pathname = usePathname();
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isRootTab = LANDLORD_ROOT_TABS.includes(pathname);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 64) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
      </div>
    );
  }

  if (!profile || (profile.active_mode ?? profile.role) !== 'landlord') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">
            {t('auth.unauthorized')}
          </h1>
          <p className="mt-2 text-sm text-charcoal-500 dark:text-white/50">
            {t('auth.wrong_role')}
          </p>
        </div>
      </div>
    );
  }

  // Bottom tab bar items (mobile) — 2 core tabs
  const bottomNavItems: NavItem[] = [
    {
      href: '/landlord/properties',
      label: t('nav.properties'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
            clipRule="evenodd"
          />
        </svg>
      ),
      matchPrefix: '/landlord/properties',
    },
    {
      href: '/landlord/settings',
      label: t('nav.settings'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      ),
      matchPrefix: '/landlord/settings',
    },
  ];

  // Side nav items (desktop) — 2 entries mirroring bottom tabs
  const sideNavItems: SideNavItem[] = [
    {
      href: '/landlord/properties',
      label: t('nav.properties'),
      matchPrefix: '/landlord/properties',
    },
    { href: '/landlord/settings', label: t('nav.settings'), matchPrefix: '/landlord/settings' },
  ];

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-charcoal-900">
      <header
        className={`fixed left-0 right-0 top-0 z-30 overflow-visible border-b border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between overflow-visible px-3 py-3 gap-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {!isRootTab && (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label={t('common.back')}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <Link
              href="/landlord/properties"
              className="flex min-w-0 items-center gap-2 text-lg font-bold text-charcoal-900 dark:text-white"
            >
              <span className="truncate">{t('app.title')}</span>
              <span className="hidden sm:inline-flex rounded border border-amber-500 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Beta
              </span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/account/mode', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ active_mode: 'tenant' }),
                });
                sessionStorage.setItem('rentos_mode_switch', 'tenant');
                window.location.href = '/tenant/dashboard';
              }}
              className="hidden min-h-[44px] rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-2 text-xs font-medium text-saffron-700 hover:bg-saffron-100 sm:inline-flex"
            >
              {t('mode.switch_to_tenant')}
            </button>
            {/* User name + PRO badge */}
            {profile?.full_name && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="text-sm text-charcoal-600 dark:text-white/60">
                  {profile.full_name}
                </span>
                {profile.tier === 'pro' && (
                  <span className="rounded-full bg-saffron-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    {t('billing.pro_badge')}
                  </span>
                )}
              </div>
            )}
            <NotificationBell
              role="landlord"
              parsing={
                activeJob && activeJob.status === 'parsing'
                  ? { progress: activeJob.progress }
                  : null
              }
            />
            <button
              type="button"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              aria-label={locale === 'th' ? t('auth.switch_to_en') : t('auth.switch_to_th')}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-warm-300 dark:border-white/15 px-2 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 sm:px-3"
            >
              {locale === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              type="button"
              onClick={signOut}
              aria-label={t('nav.logout')}
              className="hidden min-h-[44px] rounded-lg border border-warm-300 dark:border-white/15 px-3 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 sm:inline-flex"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>
      {/* Global contract parse progress bar */}
      {activeJob && activeJob.status === 'parsing' && (
        <div className="fixed top-14 left-0 right-0 z-20 h-1 bg-warm-200 dark:bg-charcoal-700 overflow-hidden">
          <div
            className="h-full bg-saffron-500 transition-all duration-700 ease-out"
            style={{ width: `${Math.round(activeJob.progress)}%` }}
          />
        </div>
      )}
      {/* Spacer to prevent content from jumping under the fixed header (~56px tall) */}
      <div className="h-14" />

      <div className="mx-auto flex max-w-7xl">
        <SideNav items={sideNavItems} />
        <main className="min-h-[calc(100vh-64px)] min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav items={bottomNavItems} />
      {/* DB CHECK constraint guarantees this is 'tenant' | 'landlord' */}
      <SimulationPanel role={(profile.active_mode ?? profile.role) as 'tenant' | 'landlord'} />
    </div>
  );
}
