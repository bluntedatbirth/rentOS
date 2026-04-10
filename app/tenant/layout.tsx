import TenantShell from './TenantShell';

export const metadata = {
  title: { default: 'RentOS — Tenant Portal', template: '%s | RentOS' },
};

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <TenantShell>{children}</TenantShell>;
}
