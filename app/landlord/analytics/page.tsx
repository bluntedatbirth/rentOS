import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { AnalyticsClient } from './AnalyticsClient';
import { getLandlordAnalytics } from '@/lib/analytics/getLandlordAnalytics';
import type { AnalyticsData } from '@/lib/analytics/getLandlordAnalytics';

export default async function AnalyticsPage() {
  const { user, profile } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const isPro =
    profile?.tier === 'pro' || process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true';

  let data: AnalyticsData | null = null;
  let blocked = false;
  let fetchError: string | null = null;

  // Only fetch if Pro (avoids wasteful work for free users)
  if (isPro || process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true') {
    const result = await getLandlordAnalytics(user.id);
    if (result.ok) {
      data = result.data;
    } else if (result.blocked) {
      blocked = true;
    } else {
      fetchError = 'load_error';
    }
  }

  return (
    <AnalyticsClient
      initialData={data}
      initialBlocked={blocked}
      initialError={fetchError}
      isPro={isPro}
    />
  );
}
