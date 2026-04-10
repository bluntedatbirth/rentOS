'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { BottomNav, type NavItem } from '@/components/ui/BottomNav';
import { SideNav, type SideNavItem } from '@/components/ui/SideNav';
import { MoreSheet, type MoreSheetItem } from '@/components/ui/MoreSheet';

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

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

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

  if (!profile || profile.role !== 'tenant') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-charcoal-900">{t('auth.unauthorized')}</h1>
          <p className="mt-2 text-sm text-charcoal-500">{t('auth.wrong_role')}</p>
        </div>
      </div>
    );
  }

  // Bottom tab bar items (mobile) — 4 core items + More action
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
      href: '/tenant/contract/view',
      label: t('nav.my_contract'),
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      matchPrefix: '/tenant/contract',
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
      href: '/tenant/maintenance',
      label: t('nav.maintenance'),
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
      matchPrefix: '/tenant/maintenance',
    },
  ];

  // More sheet items — everything not in the bottom tabs
  const moreSheetItems: MoreSheetItem[] = [
    {
      href: '/tenant/pair',
      label: t('nav.pair'),
      matchPrefix: '/tenant/pair',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M11 6a3 3 0 11-6 0 3 3 0 016 0zM14 17a6 6 0 00-12 0h12zm3-8h-2V7a1 1 0 10-2 0v2h-2a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2z" />
        </svg>
      ),
    },
    {
      href: '/tenant/co-tenants',
      label: t('nav.co_tenants'),
      matchPrefix: '/tenant/co-tenants',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
    },
    {
      href: '/tenant/documents',
      label: t('nav.documents'),
      matchPrefix: '/tenant/documents',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z"
            clipRule="evenodd"
          />
          <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
        </svg>
      ),
    },
    {
      href: '/tenant/notifications',
      label: t('nav.notifications'),
      matchPrefix: '/tenant/notifications',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      href: '/tenant/penalties/appeal',
      label: t('nav.penalties'),
      matchPrefix: '/tenant/penalties',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      href: '/tenant/security',
      label: t('nav.security'),
      matchPrefix: '/tenant/security',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      href: '/tenant/profile',
      label: t('nav.profile'),
      matchPrefix: '/tenant/profile',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      href: '/tenant/settings',
      label: t('nav.settings'),
      matchPrefix: '/tenant/settings',
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
    },
  ];

  // Side nav items (desktop)
  const sideNavItems: SideNavItem[] = [
    { href: '/tenant/dashboard', label: t('nav.dashboard') },
    { href: '/tenant/pair', label: t('nav.pair'), matchPrefix: '/tenant/pair' },
    { href: '/tenant/contract/view', label: t('nav.my_contract'), matchPrefix: '/tenant/contract' },
    { href: '/tenant/co-tenants', label: t('nav.co_tenants'), matchPrefix: '/tenant/co-tenants' },
    {
      href: '/tenant/maintenance',
      label: t('nav.maintenance'),
      matchPrefix: '/tenant/maintenance',
    },
    { href: '/tenant/documents', label: t('nav.documents'), matchPrefix: '/tenant/documents' },
    { href: '/tenant/payments', label: t('nav.payments'), matchPrefix: '/tenant/payments' },
    {
      href: '/tenant/penalties/appeal',
      label: t('nav.penalties'),
      matchPrefix: '/tenant/penalties',
    },
    {
      href: '/tenant/notifications',
      label: t('nav.notifications'),
      matchPrefix: '/tenant/notifications',
      hasBadge: true,
    },
    { href: '/tenant/security', label: t('nav.security'), matchPrefix: '/tenant/security' },
    { href: '/tenant/profile', label: t('nav.profile'), matchPrefix: '/tenant/profile' },
    { href: '/tenant/settings', label: t('nav.settings'), matchPrefix: '/tenant/settings' },
  ];

  return (
    <div className="min-h-screen bg-warm-50">
      <header
        className={`fixed left-0 right-0 top-0 z-30 border-b border-warm-200 bg-white transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              href="/tenant/dashboard"
              className="flex items-center gap-2 text-lg font-bold text-charcoal-900"
            >
              {t('app.title')}
              <span className="rounded border border-amber-500 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Beta
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell role="tenant" />
            <button
              type="button"
              onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
              aria-label={locale === 'th' ? t('auth.switch_to_en') : t('auth.switch_to_th')}
              className="min-h-[44px] min-w-[44px] rounded-lg border border-warm-200 px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-100"
            >
              {locale === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              type="button"
              onClick={signOut}
              className="min-h-[44px] rounded-lg border border-warm-200 px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-warm-100"
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

      <BottomNav
        items={bottomNavItems}
        action={{
          label: t('nav.more'),
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
          onClick: () => setMoreOpen(true),
          isActive: moreOpen,
        }}
      />
      <MoreSheet items={moreSheetItems} open={moreOpen} onClose={() => setMoreOpen(false)} />
      <SimulationPanel role="tenant" />
    </div>
  );
}
