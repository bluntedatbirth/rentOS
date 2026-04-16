'use client';

import { useI18n } from '@/lib/i18n/context';
import type { ErrorKind } from '@/lib/errors';

// ── Inline icons (Variant A — charcoal-400 colour) ─────────────────────────

const ICON_COLOR = '#8f8f8f'; // charcoal-400

function IconWifiOff({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="8"
        y1="8"
        x2="32"
        y2="32"
        stroke={ICON_COLOR}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M5 17 Q20 8 35 17"
        stroke={ICON_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M10 23 Q20 16 30 23"
        stroke={ICON_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M15 29 Q20 25 25 29"
        stroke={ICON_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="34" r="2.5" fill={ICON_COLOR} />
    </svg>
  );
}

function IconClock({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="20" r="15" stroke={ICON_COLOR} strokeWidth="2" />
      <line
        x1="20"
        y1="10"
        x2="20"
        y2="20"
        stroke={ICON_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="20"
        x2="28"
        y2="25"
        stroke={ICON_COLOR}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="2" fill={ICON_COLOR} />
    </svg>
  );
}

function IconServer({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="10" width="28" height="9" rx="2.5" stroke={ICON_COLOR} strokeWidth="2" />
      <rect x="6" y="21" width="28" height="9" rx="2.5" stroke={ICON_COLOR} strokeWidth="2" />
      <circle cx="12" cy="14.5" r="2" fill={ICON_COLOR} />
      <circle cx="12" cy="25.5" r="2" fill={ICON_COLOR} />
      <line
        x1="19"
        y1="14.5"
        x2="27"
        y2="14.5"
        stroke={ICON_COLOR}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="19"
        y1="25.5"
        x2="27"
        y2="25.5"
        stroke={ICON_COLOR}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Red error dot */}
      <circle cx="32" cy="32" r="5" fill="#dc2626" />
      <line
        x1="32"
        y1="29.5"
        x2="32"
        y2="32.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="34.5" r="0.75" fill="white" />
    </svg>
  );
}

// ── Key maps ────────────────────────────────────────────────────────────────

const HEADING_KEY: Record<ErrorKind, string> = {
  network: 'error.network.heading',
  timeout: 'error.timeout.heading',
  server: 'error.server.heading',
};

const BODY_KEY: Record<ErrorKind, string> = {
  network: 'error.network.body',
  timeout: 'error.timeout.body',
  server: 'error.server.body',
};

const ICON_MAP: Record<ErrorKind, React.FC<{ size?: number }>> = {
  network: IconWifiOff,
  timeout: IconClock,
  server: IconServer,
};

// ── Component ────────────────────────────────────────────────────────────────

export interface ErrorStateProps {
  /** Which of the three error types to display */
  kind: ErrorKind;
  /** If provided, renders a clickable ghost retry button */
  onRetry?: () => void;
  /** Extra classes for layout tweaks at the call site */
  className?: string;
}

/**
 * Variant A error state — soft warm-50 background, charcoal-400 icon,
 * apologetic copy, optional ghost retry button.
 *
 * All copy is i18n-driven via error.{kind}.heading / error.{kind}.body.
 */
export function ErrorState({ kind, onRetry, className = '' }: ErrorStateProps) {
  const { t } = useI18n();
  const Icon = ICON_MAP[kind];

  return (
    <div
      className={`rounded-xl border border-warm-200 bg-warm-50 dark:bg-charcoal-800/50 dark:border-white/10 p-6 flex flex-col items-center text-center gap-3 ${className}`}
    >
      <div className="mt-1">
        <Icon size={40} />
      </div>

      <h4 className="text-base font-bold text-charcoal-900 dark:text-white leading-snug">
        {t(HEADING_KEY[kind])}
      </h4>

      <p className="text-sm text-charcoal-600 dark:text-white/60 leading-relaxed max-w-[260px]">
        {t(BODY_KEY[kind])}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-charcoal-300 dark:border-white/20 px-5 py-2 text-sm font-semibold text-charcoal-700 dark:text-white/70 hover:bg-warm-100 dark:hover:bg-white/10 transition-colors"
        >
          {t('error.retry')}
        </button>
      )}
    </div>
  );
}
