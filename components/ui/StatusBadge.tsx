const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-warm-100 text-charcoal-700',
  terminated: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  awaiting_signature: 'bg-indigo-100 text-indigo-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  confirmed: 'bg-orange-100 text-orange-800',
  waived: 'bg-warm-100 text-charcoal-700',
  pending_landlord_review: 'bg-yellow-100 text-yellow-800',
  pending_tenant_appeal: 'bg-amber-100 text-amber-800',
  appeal_under_review: 'bg-purple-100 text-purple-800',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-warm-100 text-charcoal-700';
  const display = label ?? status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style} ${className}`}
    >
      {display}
    </span>
  );
}
