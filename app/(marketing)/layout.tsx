import { Manrope, Plus_Jakarta_Sans, Noto_Sans_Thai } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-thai',
  display: 'swap',
});

/**
 * Marketing layout — lighter than the app layout.
 * Skips <Providers> (Supabase session) and <PWAProvider> to keep
 * JS payload minimal for the landing page.
 *
 * Fonts: Manrope (headlines) + Plus Jakarta Sans (body) + Noto Sans Thai (Thai locale)
 * Design system: "Editorial Humanism" from Stitch — reviewed by UI/UX Pro Max
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${manrope.variable} ${plusJakarta.variable} ${notoSansThai.variable}`}>
      {children}
    </div>
  );
}
