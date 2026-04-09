import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/supabase/api';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id } = params;
  if (!id) return badRequest('Missing notification id');

  // Verify ownership and mark as read
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', user.id)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  if (!data) {
    return notFound('Notification not found');
  }

  return NextResponse.json(data);
}
