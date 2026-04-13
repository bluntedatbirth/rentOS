'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/context';

// ── Inline SVG flag components (≤400 bytes each) ──────────────────────────

// Thailand: 5 horizontal stripes — red/white/blue/white/red
function FlagTH({ size = 20 }: { size?: number }) {
  const h = size * 0.667;
  return (
    <svg width={size} height={h} viewBox="0 0 30 20" aria-hidden="true" focusable="false">
      <rect width="30" height="4" y="0" fill="#A51931" />
      <rect width="30" height="4" y="4" fill="#F4F5F0" />
      <rect width="30" height="4" y="8" fill="#2D2A4A" />
      <rect width="30" height="4" y="12" fill="#F4F5F0" />
      <rect width="30" height="4" y="16" fill="#A51931" />
    </svg>
  );
}

// UK: Union Jack — simplified but recognisable
function FlagGB({ size = 20 }: { size?: number }) {
  const h = size * 0.667;
  return (
    <svg width={size} height={h} viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <rect width="60" height="40" fill="#012169" />
      {/* White diagonals */}
      <line x1="0" y1="0" x2="60" y2="40" stroke="#fff" strokeWidth="8" />
      <line x1="60" y1="0" x2="0" y2="40" stroke="#fff" strokeWidth="8" />
      {/* Red diagonals */}
      <line x1="0" y1="0" x2="60" y2="40" stroke="#C8102E" strokeWidth="4" />
      <line x1="60" y1="0" x2="0" y2="40" stroke="#C8102E" strokeWidth="4" />
      {/* White cross */}
      <rect x="23" y="0" width="14" height="40" fill="#fff" />
      <rect x="0" y="13" width="60" height="14" fill="#fff" />
      {/* Red cross */}
      <rect x="26" y="0" width="8" height="40" fill="#C8102E" />
      <rect x="0" y="16" width="60" height="8" fill="#C8102E" />
    </svg>
  );
}

// China: red field, large gold star + 4 small gold stars (hidden for now)
function _FlagCN({ size = 20 }: { size?: number }) {
  const h = size * 0.667;
  return (
    <svg width={size} height={h} viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <rect width="60" height="40" fill="#DE2910" />
      {/* Large star at ~(12,10) */}
      <polygon
        points="12,5 13.8,10.5 19.6,10.5 15,13.8 16.8,19.3 12,16 7.2,19.3 9,13.8 4.4,10.5 10.2,10.5"
        fill="#FFDE00"
        transform="scale(1.1) translate(-1,-1)"
      />
      {/* 4 small stars */}
      <polygon
        points="22,3 22.7,5.2 25,5.2 23.1,6.5 23.8,8.7 22,7.4 20.2,8.7 20.9,6.5 19,5.2 21.3,5.2"
        fill="#FFDE00"
      />
      <polygon
        points="27,7 27.7,9.2 30,9.2 28.1,10.5 28.8,12.7 27,11.4 25.2,12.7 25.9,10.5 24,9.2 26.3,9.2"
        fill="#FFDE00"
      />
      <polygon
        points="27,14 27.7,16.2 30,16.2 28.1,17.5 28.8,19.7 27,18.4 25.2,19.7 25.9,17.5 24,16.2 26.3,16.2"
        fill="#FFDE00"
      />
      <polygon
        points="22,18 22.7,20.2 25,20.2 23.1,21.5 23.8,23.7 22,22.4 20.2,23.7 20.9,21.5 19,20.2 21.3,20.2"
        fill="#FFDE00"
      />
    </svg>
  );
}

// ── Locale metadata ────────────────────────────────────────────────────────

interface LocaleOption {
  locale: Locale;
  shortLabel: string;
  fullLabel: string;
  Flag: React.FC<{ size?: number }>;
}

const LOCALE_OPTIONS: LocaleOption[] = [
  { locale: 'th', shortLabel: 'TH', fullLabel: 'ภาษาไทย', Flag: FlagTH },
  { locale: 'en', shortLabel: 'EN', fullLabel: 'English', Flag: FlagGB },
  // ZH hidden for now — translations not production-ready; re-enable when expanding to Chinese market
  // { locale: 'zh', shortLabel: 'ZH', fullLabel: '简体中文', Flag: FlagCN },
];

// ── ChevronDown icon ───────────────────────────────────────────────────────

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
      style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path
        d="M2 4l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Checkmark icon ─────────────────────────────────────────────────────────

function Checkmark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path
        d="M2.5 7l3 3 6-6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  variant?: 'inline' | 'dropdown';
  /** Restrict which locales appear in the dropdown. Defaults to all. */
  onlyLocales?: Locale[];
}

export function LanguageToggle({ variant: _variant = 'inline', onlyLocales }: Props) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const visibleOptions = onlyLocales
    ? LOCALE_OPTIONS.filter((o) => onlyLocales.includes(o.locale))
    : LOCALE_OPTIONS;

  // LOCALE_OPTIONS always has entries for every valid Locale — non-null is safe
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentOption = visibleOptions.find((o) => o.locale === locale) ?? visibleOptions[0]!;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  // Keyboard: Escape closes; Arrow up/down navigates rows; Enter selects
  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      // Focus first / current item after paint
      setTimeout(() => {
        const focused =
          listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]') ??
          listRef.current?.querySelector<HTMLElement>('[role="option"]');
        focused?.focus();
      }, 0);
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
    );
    const idx = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.click();
    }
  }

  function handleSelect(l: Locale) {
    setLocale(l);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language — ${currentOption.fullLabel}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex items-center gap-1.5 rounded-full border border-warm-200 bg-transparent px-3 py-1.5 text-sm font-medium text-charcoal-700 hover:bg-warm-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400"
      >
        <currentOption.Flag size={18} />
        <span>{currentOption.shortLabel}</span>
        <ChevronDown open={open} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Select language"
          onKeyDown={handleListKeyDown}
          className="absolute right-0 z-50 mt-1.5 min-w-[160px] rounded-lg border border-warm-200 bg-warm-50 py-1 shadow-md focus:outline-none"
          tabIndex={-1}
        >
          {visibleOptions.map((opt) => {
            const isActive = opt.locale === locale;
            return (
              <li
                key={opt.locale}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => handleSelect(opt.locale)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(opt.locale);
                  }
                }}
                className={[
                  'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm focus:outline-none',
                  isActive
                    ? 'bg-saffron-50 text-saffron-700'
                    : 'text-charcoal-700 hover:bg-warm-100 focus:bg-warm-100',
                ].join(' ')}
              >
                <opt.Flag size={18} />
                <span className="flex-1">{opt.fullLabel}</span>
                {isActive && (
                  <span className="text-saffron-500">
                    <Checkmark />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
