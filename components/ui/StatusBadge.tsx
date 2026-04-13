const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  expired: 'bg-warm-100 text-charcoal-700 dark:bg-white/5 dark:text-white/50',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  awaiting_signature: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  waived: 'bg-warm-100 text-charcoal-700 dark:bg-white/5 dark:text-white/50',
  pending_landlord_review:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  pending_tenant_appeal: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  appeal_under_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const style =
    statusStyles[status] ?? 'bg-warm-100 text-charcoal-700 dark:bg-white/5 dark:text-white/50';
  const display = label ?? status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style} ${className}`}
    >
      {display}
    </span>
  );
}
