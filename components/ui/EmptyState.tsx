import { Card } from '@/components/ui/Card';

// ── Inline icons ────────────────────────────────────────────────────────────

/** Receipt with coin — landlord payments empty state (Variant C, 48px) */
export function IconReceiptMid({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="8"
        y="6"
        width="28"
        height="36"
        rx="3"
        fill="#fdf7ec"
        stroke="#d48800"
        strokeWidth="1.5"
      />
      <polyline
        points="8,42 11.5,46 15,42 18.5,46 22,42 25.5,46 29,42 32.5,46 36,42"
        fill="none"
        stroke="#d48800"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="14"
        y1="18"
        x2="30"
        y2="18"
        stroke="#d48800"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="24"
        x2="26"
        y2="24"
        stroke="#d48800"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/** House with checkmark badge — tenant payments empty state (Variant C, 48px) */
export function IconHouseMid({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 8 L42 22 L38 22 L38 40 L10 40 L10 22 L6 22 Z"
        fill="#f2f7f2"
        stroke="#5a7a5a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="20"
        y="30"
        width="8"
        height="10"
        rx="1.5"
        fill="#bfdbbf"
        stroke="#5a7a5a"
        strokeWidth="1.2"
      />
      <rect
        x="13"
        y="25"
        width="7"
        height="7"
        rx="1"
        fill="#bfdbbf"
        stroke="#5a7a5a"
        strokeWidth="1.2"
      />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  /** Inline SVG element passed by caller — see IconReceiptMid / IconHouseMid above */
  icon: React.ReactNode;
  /** Bold heading line */
  heading: string;
  /** Explainer sentence below the heading */
  context: string;
  /** Italic "what happens next" guidance line */
  nextStep: string;
}

/**
 * Variant C empty state — medium icon in a warm-100 tile on the left,
 * heading + context sentence + italic next-step line on the right.
 *
 * Matches the EmptyStateCardC design from the Sprint 6 preview exactly.
 */
export function EmptyState({ icon, heading, context, nextStep }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-start py-8 px-6 gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl bg-warm-100 p-2">{icon}</div>
        <div>
          <h3 className="text-base font-bold text-charcoal-900 dark:text-white mb-1">{heading}</h3>
          <p className="text-sm text-charcoal-600 dark:text-white/60 mb-2">{context}</p>
          <p className="text-sm text-charcoal-400 dark:text-white/40 italic">{nextStep}</p>
        </div>
      </div>
    </Card>
  );
}
