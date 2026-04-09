interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold tracking-wider bg-amber-400 text-amber-900 ${className}`}
    >
      PRO
    </span>
  );
}
