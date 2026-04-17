/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// script-src:
//   - Production: no 'unsafe-eval', no jsdelivr.
//   - Development: 'unsafe-eval' is required because Next.js dev uses
//     eval-source-map (webpack HMR + source maps rely on eval()). Removing
//     it breaks hydration entirely.
//   - 'unsafe-inline' retained in both: Next.js 14 App Router injects inline
//     bootstrap scripts during hydration. A nonce-based refactor would remove
//     the need for 'unsafe-inline' in production; tracked as a P1 follow-up.
//   - Do NOT add 'strict-dynamic' without implementing nonces — it causes
//     modern browsers to ignore 'self' and 'unsafe-inline' entirely, blocking
//     every script on the page.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.omise.co"
  : "script-src 'self' 'unsafe-inline' https://cdn.omise.co";

const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@supabase/ssr',
      'zod',
      'framer-motion',
      'lucide-react',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/legal',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              // *.supabase.co covers storage + image transform endpoints
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vault.omise.co https://api.omise.co",
              // Allow Supabase storage iframes for contract preview (PDF embed)
              "frame-src 'self' https://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default nextConfig;
