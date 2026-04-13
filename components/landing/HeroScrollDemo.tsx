'use client';

import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { FileText, Home, CreditCard, Globe, Upload, Shield } from 'lucide-react';

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
            <h2
              className="font-[var(--font-manrope)] text-3xl md:text-5xl font-light text-charcoal-900 dark:text-white"
              style={{ letterSpacing: '-0.02em' }}
            >
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
    <div className="h-full w-full bg-warm-50 overflow-hidden text-charcoal-800">
      {/* Top nav bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-charcoal-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-saffron-500 rounded-lg flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-[var(--font-manrope)] font-bold text-charcoal-900 text-sm">
            RentOS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-charcoal-400" />
          <div className="w-7 h-7 bg-sage-500/20 rounded-full flex items-center justify-center text-xs font-bold text-sage-700">
            J
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-4 md:p-6 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Home className="w-4 h-4 text-saffron-600" />}
            value="3"
            label="Properties"
            accent="saffron"
          />
          <StatCard
            icon={<FileText className="w-4 h-4 text-sage-600" />}
            value="5"
            label="Contracts"
            accent="sage"
          />
          <StatCard
            icon={<CreditCard className="w-4 h-4 text-saffron-600" />}
            value="฿45,000"
            label="Monthly"
            accent="saffron"
          />
        </div>

        {/* Property cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-[var(--font-manrope)] font-semibold text-sm text-charcoal-900">
              My Properties
            </h3>
            <span className="text-xs text-saffron-600 font-medium">View all</span>
          </div>
          <PropertyCard
            name="Sukhumvit Residence"
            unit="Unit 12A"
            rent="฿18,000"
            status="Active"
            statusColor="sage"
          />
          <PropertyCard
            name="Silom Heights"
            unit="Unit 8B"
            rent="฿15,000"
            status="Active"
            statusColor="sage"
          />
          <PropertyCard
            name="Thonglor Living"
            unit="Unit 3C"
            rent="฿12,000"
            status="Expiring"
            statusColor="saffron"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={<Upload className="w-4 h-4" />}
            label="Upload Contract"
            color="saffron"
          />
          <QuickAction icon={<Shield className="w-4 h-4" />} label="AI Analysis" color="sage" />
        </div>
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
    <div className="bg-white rounded-xl p-3 border border-charcoal-100">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${accent === 'saffron' ? 'bg-saffron-500/10' : 'bg-sage-500/10'}`}
      >
        {icon}
      </div>
      <p className="font-[var(--font-manrope)] font-bold text-lg text-charcoal-900 leading-none">
        {value}
      </p>
      <p className="text-[11px] text-charcoal-500 mt-0.5">{label}</p>
    </div>
  );
}

function PropertyCard({
  name,
  unit,
  rent,
  status,
  statusColor,
}: {
  name: string;
  unit: string;
  rent: string;
  status: string;
  statusColor: 'saffron' | 'sage';
}) {
  return (
    <div className="bg-white rounded-xl p-3 md:p-4 border border-charcoal-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-charcoal-100 rounded-lg flex items-center justify-center">
          <Home className="w-5 h-5 text-charcoal-400" />
        </div>
        <div>
          <p className="font-medium text-sm text-charcoal-900">{name}</p>
          <p className="text-xs text-charcoal-500">{unit}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-[var(--font-manrope)] font-semibold text-sm text-charcoal-900">{rent}</p>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor === 'sage' ? 'bg-sage-500/10 text-sage-700' : 'bg-saffron-500/10 text-saffron-700'}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: 'saffron' | 'sage';
}) {
  return (
    <div
      className={`rounded-xl p-3 flex items-center gap-2 border ${color === 'saffron' ? 'bg-saffron-500/5 border-saffron-500/20 text-saffron-700' : 'bg-sage-500/5 border-sage-500/20 text-sage-700'}`}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
