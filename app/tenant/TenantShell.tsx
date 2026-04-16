'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { BottomNav, type NavItem } from '@/components/ui/BottomNav';
import { SideNav, type SideNavItem } from '@/components/ui/SideNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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

const TENANT_ROOT_TABS = ['/tenant/dashboard', '/tenant/payments', '/tenant/settings'];

export default function TenantShell({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isRootTab = TENANT_ROOT_TABS.includes(pathname);

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

  if (!profile || (profile.active_mode ?? profile.role) !== 'tenant') {
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

  // Bottom tab bar items (mobile) — 3 core items
  const bottomNavItems: NavItem[] = [
    {
      href: '/tenant/dashboard',
      label: t('nav.dashboard'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      href: '/tenant/payments',
      label: t('nav.payments'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 1a1 1 0 100 2 1 1 0 000-2z"
            clipRule="evenodd"
          />
        </svg>
      ),
      matchPrefix: '/tenant/payments',
    },
    {
      href: '/tenant/settings',
      label: t('nav.settings'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
      ),
      matchPrefix: '/tenant/settings',
    },
  ];

  // Side nav items (desktop)
  const sideNavItems: SideNavItem[] = [
    { href: '/tenant/dashboard', label: t('nav.dashboard') },
    { href: '/tenant/payments', label: t('nav.payments'), matchPrefix: '/tenant/payments' },
    { href: '/tenant/settings', label: t('nav.settings'), matchPrefix: '/tenant/settings' },
  ];

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-charcoal-900">
      <header
        className={`fixed left-0 right-0 top-0 z-30 border-b border-warm-200 dark:border-white/10 bg-white dark:bg-charcoal-800 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {!isRootTab && (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label={t('common.back')}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
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
              href="/tenant/dashboard"
              className="flex items-center gap-2 text-lg font-bold text-charcoal-900 dark:text-white"
            >
              {t('app.title')}
              <span className="rounded border border-amber-500 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Beta
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/account/mode', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ active_mode: 'landlord' }),
                });
                sessionStorage.setItem('rentos_mode_switch', 'landlord');
                window.location.href = '/landlord/properties';
              }}
              className="min-h-[44px] rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-2 text-xs font-medium text-saffron-700 hover:bg-saffron-100"
            >
              {t('mode.switch_to_landlord')}
            </button>
            <NotificationBell role="tenant" />
            <button
              type="button"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              aria-label={locale === 'th' ? t('auth.switch_to_en') : t('auth.switch_to_th')}
              className="min-h-[44px] min-w-[44px] rounded-lg border border-warm-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
            >
              {locale === 'th' ? 'EN' : 'TH'}
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className="min-h-[44px] rounded-lg border border-warm-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>
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
