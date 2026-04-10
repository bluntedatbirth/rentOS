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
    default: 'RentOS — Free rental management for Thai landlords',
    template: '%s | RentOS',
  },
  description:
    'The easiest way for Thai landlords to manage properties, contracts, and tenants. Free for up to 2 properties — no card required.',
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
    title: 'RentOS — Free rental management for Thai landlords',
    description:
      'The easiest way for Thai landlords to manage properties, contracts, and tenants. Free for up to 2 properties — no card required.',
    url: 'https://rentos.homes',
    siteName: 'RentOS',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'RentOS — rental management for Thai landlords',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RentOS — Free rental management for Thai landlords',
    description:
      'The easiest way for Thai landlords to manage properties, contracts, and tenants. Free for up to 2 properties — no card required.',
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
    <html lang="en">
      <head>
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
