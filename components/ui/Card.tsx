interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const base =
    'rounded-lg bg-white dark:bg-charcoal-800 p-4 shadow-sm dark:shadow-black/20 border border-warm-200 dark:border-white/10';
  const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';
  return (
    <div
      className={`${base} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-sm font-semibold text-charcoal-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardValue({ children, className = '' }: CardTitleProps) {
  return (
    <p className={`mt-1 text-2xl font-bold text-charcoal-900 dark:text-white ${className}`}>
      {children}
    </p>
  );
}

export function CardDescription({ children, className = '' }: CardTitleProps) {
  return (
    <p className={`mt-1 text-xs text-charcoal-500 dark:text-white/50 ${className}`}>{children}</p>
  );
}
