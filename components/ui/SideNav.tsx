'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { ProRibbon } from '@/components/ui/ProRibbon';

export interface SideNavItem {
  href: string;
  label: string;
  matchPrefix?: string;
  hasBadge?: boolean;
  isPro?: boolean;
}

interface SideNavProps {
  items: SideNavItem[];
}

function NavLinks({ items, onLinkClick }: { items: SideNavItem[]; onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.matchPrefix && pathname.startsWith(item.matchPrefix));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={`relative overflow-hidden flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-saffron-50 dark:bg-saffron-500/15 text-saffron-600'
                : 'text-charcoal-500 dark:text-white/50 hover:bg-warm-100 dark:hover:bg-white/10 hover:text-charcoal-900 dark:hover:text-white'
            }`}
          >
            {item.label}
            {item.isPro && <ProRibbon size="sm" />}
            {item.hasBadge && <NotificationBadge />}
          </Link>
        );
      })}
    </div>
  );
}

export function SideNav({ items }: SideNavProps) {
  return (
    /* Desktop sidebar — always visible on md+ */
    <nav className="hidden md:block w-56 shrink-0 border-r border-warm-200 dark:border-white/10 bg-warm-50 dark:bg-charcoal-900">
      <div className="sticky top-0">
        <NavLinks items={items} />
      </div>
    </nav>
  );
}
