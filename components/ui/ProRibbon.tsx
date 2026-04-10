'use client';

/**
 * Diagonal corner ribbon for PRO features.
 * Parent must have `position: relative` and `overflow: hidden`.
 *
 * Usage:
 *   <div className="relative overflow-hidden ...">
 *     <ProRibbon />
 *     ... content ...
 *   </div>
 */
export function ProRibbon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  // sm = smaller ribbon for nav items, md = standard for buttons/cards
  const styles =
    size === 'sm'
      ? 'w-20 text-[8px] py-[2px] top-[6px] -right-[22px]'
      : 'w-24 text-[9px] py-[3px] top-[8px] -right-[26px]';

  return (
    <span
      className={`pointer-events-none absolute rotate-45 bg-gradient-to-r from-sage-500 to-sage-600 text-center font-bold uppercase tracking-wider text-white shadow-sm ${styles}`}
      aria-label="Pro feature"
    >
      PRO
    </span>
  );
}
