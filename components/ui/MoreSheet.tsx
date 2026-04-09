'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/context';
import { ProRibbon } from '@/components/ui/ProRibbon';

export interface MoreSheetItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPrefix?: string;
  isPro?: boolean;
}

interface MoreSheetProps {
  items: MoreSheetItem[];
  open: boolean;
  onClose: () => void;
}

export function MoreSheet({ items, open, onClose }: MoreSheetProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-safe md:hidden">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800">{t('nav.more')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Grid of items */}
        <div className="grid grid-cols-3 gap-1 px-4 py-4 pb-6">
          {items.map((item) => {
            const isActive =
              pathname === item.href || (item.matchPrefix && pathname.startsWith(item.matchPrefix));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative overflow-hidden flex flex-col items-center gap-2 rounded-xl px-2 py-4 text-center transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  {item.icon}
                </span>
                <span className="text-xs font-medium leading-tight">{item.label}</span>
                {item.isPro && <ProRibbon size="sm" />}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
