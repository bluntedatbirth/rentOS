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
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
    <nav className="hidden md:block w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="sticky top-0">
        <NavLinks items={items} />
      </div>
    </nav>
  );
}
