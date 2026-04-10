interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold tracking-wider bg-sage-500 text-white ${className}`}
    >
      PRO
    </span>
  );
}
