import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';

export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('sent_at', { ascending: false });

  if (unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}
