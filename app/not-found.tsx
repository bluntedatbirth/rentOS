'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#fefcf7] px-6 text-center">
      <p className="text-8xl font-bold text-[#f0a500] leading-none select-none">404</p>
      <h1 className="mt-6 text-2xl font-semibold text-[#2c2c2c]">{t('notfound.title')}</h1>
      <p className="mt-3 max-w-sm text-base text-[#2c2c2c]/70 leading-relaxed">
        {t('notfound.body')}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-[#f0a500] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#d99400] transition-colors"
      >
        {t('notfound.home_cta')}
      </Link>
      <Link
        href="/login"
        className="mt-4 text-sm text-[#2c2c2c]/50 hover:text-[#2c2c2c] transition-colors"
      >
        {t('notfound.login_cta')}
      </Link>
    </main>
  );
}
