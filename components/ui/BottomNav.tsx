'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string;
}

export interface BottomNavAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

interface BottomNavProps {
  items: NavItem[];
  /** Optional action button (e.g. "More") appended after nav items */
  action?: BottomNavAction;
}

export function BottomNav({ items, action }: BottomNavProps) {
  const pathname = usePathname();

  const baseClasses =
    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors';
  const activeClasses = 'text-primary-600';
  const inactiveClasses = 'text-gray-500 hover:text-gray-700';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.matchPrefix && pathname.startsWith(item.matchPrefix));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`${baseClasses} ${action.isActive ? activeClasses : inactiveClasses}`}
          >
            <span className="text-xl">{action.icon}</span>
            <span className="truncate">{action.label}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
