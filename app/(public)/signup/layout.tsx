import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up — RentOS',
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
