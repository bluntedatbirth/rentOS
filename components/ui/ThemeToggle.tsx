'use client';

import { useTheme } from '@/lib/theme/context';

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme();

  // Skeleton placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return <div className="h-9 w-9 rounded-full" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex items-center justify-center rounded-full border border-warm-200 dark:border-white/10 bg-transparent p-2 text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400 active:scale-95 transition-all duration-200 min-h-[36px] min-w-[36px] cursor-pointer"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
