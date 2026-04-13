import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PWAProvider } from '@/components/pwa/PWAProvider';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rentos.homes'),
  title: {
    default: 'RentOS — Rental management for Thailand',
    template: '%s | RentOS',
  },
  description:
    'The easiest way to manage rental properties, contracts, and tenants in Thailand. Thai and English, built for both sides of the lease.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RentOS',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
  other: {
    'theme-color': '#2563EB',
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'RentOS — Rental management for Thailand',
    description:
      'The easiest way to manage rental properties, contracts, and tenants in Thailand. Thai and English, built for both sides of the lease.',
    url: 'https://rentos.homes',
    siteName: 'RentOS',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'RentOS — rental management for Thailand',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentOS — Rental management for Thailand',
    description:
      'The easiest way to manage rental properties, contracts, and tenants in Thailand. Thai and English, built for both sides of the lease.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rentos_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#2563EB" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${dmSans.variable} antialiased`}>
        <Providers>{children}</Providers>
        <PWAProvider />
      </body>
    </html>
  );
}
