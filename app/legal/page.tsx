import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

const LegalClient = dynamic(() => import('./LegalClient').then((m) => m.LegalClient), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-charcoal-400 text-sm">Loading…</div>,
});

export const metadata = {
  title: 'Privacy & Terms — RentOS',
  description: 'Privacy Policy and Terms of Service for RentOS',
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Top nav */}
      <nav className="border-b border-warm-200 bg-warm-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-charcoal-800 hover:text-saffron-500 transition-colors"
          >
            <span className="text-xl font-bold tracking-tight">RentOS</span>
            <span className="text-sm text-charcoal-500">← Back to home</span>
          </Link>
          <LanguageToggle variant="inline" />
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <LegalClient />
      </main>

      {/* Footer */}
      <footer className="border-t border-warm-200 mt-16">
        <div className="mx-auto max-w-3xl px-6 py-6 text-center text-sm text-charcoal-500">
          © {new Date().getFullYear()} RentOS. Questions? Email{' '}
          <a href="mailto:hello@rentos.homes" className="text-saffron-600 hover:underline">
            hello@rentos.homes
          </a>
        </div>
      </footer>
    </div>
  );
}
