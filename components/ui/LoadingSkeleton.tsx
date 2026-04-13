interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-warm-200 dark:bg-charcoal-700 ${className}`} />;
}

export function LoadingSkeleton({ className = '', count = 3 }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg bg-white dark:bg-charcoal-800 border border-warm-100 dark:border-white/10 p-4 shadow-sm dark:shadow-black/20"
        >
          <SkeletonLine className="mb-3 h-4 w-1/3" />
          <SkeletonLine className="mb-2 h-3 w-2/3" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
    </div>
  );
}
