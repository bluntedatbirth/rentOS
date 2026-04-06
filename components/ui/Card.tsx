interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const base = 'rounded-lg bg-white p-4 shadow-sm';
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
  return <h3 className={`text-sm font-semibold text-gray-900 ${className}`}>{children}</h3>;
}

export function CardValue({ children, className = '' }: CardTitleProps) {
  return <p className={`mt-1 text-2xl font-bold text-gray-900 ${className}`}>{children}</p>;
}

export function CardDescription({ children, className = '' }: CardTitleProps) {
  return <p className={`mt-1 text-xs text-gray-500 ${className}`}>{children}</p>;
}
