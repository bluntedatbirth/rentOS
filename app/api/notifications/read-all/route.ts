import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';

export async function POST() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
