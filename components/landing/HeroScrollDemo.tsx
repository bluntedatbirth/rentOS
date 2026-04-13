'use client';

import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { Home, FileText, CreditCard, Settings, Bell } from 'lucide-react';

interface HeroScrollDemoProps {
  labels: {
    headline: string;
    subheadline: string;
    badge: string;
  };
}

export function HeroScrollDemo({ labels }: HeroScrollDemoProps) {
  return (
    <section className="bg-warm-50 dark:bg-charcoal-900">
      <ContainerScroll
        titleComponent={
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-500/10 dark:bg-saffron-500/20 px-4 py-1.5 text-sm font-medium text-saffron-700 dark:text-saffron-300">
              {labels.badge}
            </span>
            <h2 className="font-[var(--font-manrope)] text-3xl md:text-5xl font-light text-charcoal-900 dark:text-white tracking-[-0.02em]">
              {labels.headline.split('\n').map((line, i) => (
                <span key={i}>
                  {i === 0 ? line : <span className="font-bold text-saffron-500">{line}</span>}
                  {i === 0 && <br />}
                </span>
              ))}
            </h2>
            <p className="text-charcoal-600 dark:text-white/70 text-base md:text-lg max-w-lg mx-auto">
              {labels.subheadline}
            </p>
          </div>
        }
      >
        {/* App mockup inside the scroll container */}
        <AppMockup />
      </ContainerScroll>
    </section>
  );
}

function AppMockup() {
  return (
    <div className="h-full w-full bg-warm-50 overflow-hidden text-charcoal-800 flex flex-col">
      {/* Top nav bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-warm-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-saffron-500 rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-[var(--font-manrope)] font-bold text-charcoal-900 text-sm">
            RentOS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-charcoal-400" />
          <div className="w-7 h-7 bg-sage-500/20 rounded-full flex items-center justify-center text-xs font-bold text-sage-700">
            J
          </div>
        </div>
      </div>

      {/* Scrollable dashboard content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
        {/* Page heading */}
        <div>
          <h1 className="text-sm font-bold text-charcoal-900">Landlord Dashboard</h1>
          <p className="text-xs text-charcoal-500">Welcome back, Jakraphan</p>
        </div>

        {/* Stats row — matches DashboardClient 3-card layout */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <StatCard
            icon={<Home className="w-3.5 h-3.5 text-saffron-500" />}
            value="3"
            label="Active Properties"
            accent="saffron"
          />
          <StatCard
            icon={<CreditCard className="w-3.5 h-3.5 text-saffron-500" />}
            value="฿12,500"
            label="Unpaid Rent"
            accent="saffron"
          />
          <StatCard
            icon={<FileText className="w-3.5 h-3.5 text-sage-500" />}
            value="1"
            label="Expiring Soon"
            accent="sage"
          />
        </div>

        {/* Properties section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-[var(--font-manrope)] font-semibold text-sm text-charcoal-900">
              My Properties
            </h3>
            <span className="text-xs text-saffron-500 font-medium">View all →</span>
          </div>
          <PropertyCard
            name="Sukhumvit Residence"
            meta="4 units · 3 occupied"
            status="Active"
            statusVariant="active"
          />
          <PropertyCard
            name="Silom Heights"
            meta="2 units · 2 occupied"
            status="Active"
            statusVariant="active"
          />
          <PropertyCard
            name="Thonglor Living"
            meta="1 unit · 1 occupied"
            status="Expiring"
            statusVariant="expiring"
          />
        </div>
      </div>

      {/* Bottom nav bar — matches landlord nav tabs */}
      <div className="shrink-0 bg-white border-t border-warm-200 flex items-center justify-around px-2 py-2">
        <NavTab icon={<Home className="w-4 h-4" />} label="Properties" active />
        <NavTab icon={<Settings className="w-4 h-4" />} label="Settings" />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: 'saffron' | 'sage';
}) {
  return (
    <div className="rounded-xl bg-white border border-warm-200 shadow-sm p-2.5 md:p-3">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${accent === 'saffron' ? 'bg-saffron-500/10' : 'bg-sage-500/10'}`}
      >
        {icon}
      </div>
      <p className="font-[var(--font-manrope)] font-bold text-base text-charcoal-900 leading-none">
        {value}
      </p>
      <p className="text-[10px] text-charcoal-500 mt-0.5 leading-tight">{label}</p>
      <p className="text-[9px] text-saffron-500 font-medium mt-1.5">View all →</p>
    </div>
  );
}

function PropertyCard({
  name,
  meta,
  status,
  statusVariant,
}: {
  name: string;
  meta: string;
  status: string;
  statusVariant: 'active' | 'expiring';
}) {
  const badgeClass =
    statusVariant === 'active' ? 'bg-sage-100 text-sage-700' : 'bg-saffron-100 text-saffron-700';

  return (
    <div className="rounded-xl bg-white border border-warm-200 shadow-sm flex items-center gap-3 p-3">
      <div className="w-9 h-9 bg-warm-100 rounded-lg flex items-center justify-center shrink-0">
        <Home className="w-4 h-4 text-charcoal-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-xs text-charcoal-900 truncate">{name}</p>
        <p className="text-[10px] text-charcoal-500 mt-0.5">{meta}</p>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
        {status}
      </span>
    </div>
  );
}

function NavTab({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${active ? 'text-saffron-500' : 'text-charcoal-400'}`}
    >
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </div>
  );
}
