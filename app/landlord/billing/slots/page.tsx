import { createServerSupabaseClient } from '@/lib/supabase/server';
import SlotsClient from './SlotsClient';

export default async function SlotsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let purchasedSlots = 0;
  let isPro = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('purchased_slots, tier')
      .eq('id', user.id)
      .single();
    purchasedSlots = profile?.purchased_slots ?? 0;
    isPro = profile?.tier === 'pro';
  }

  return <SlotsClient initialPurchasedSlots={purchasedSlots} isPro={isPro} />;
}
