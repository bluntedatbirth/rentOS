import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/notifications/dismiss-by-url
 * Dismiss (delete) all notifications whose URL matches the given path prefix.
 * Also accepts notification types to dismiss.
 * Used for auto-clearing notifications when the user visits the relevant page.
 */
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const url = body?.url as string | undefined;
  const types = body?.types as string[] | undefined;

  if (!url && (!types || types.length === 0)) {
    return badRequest('Provide url or types to dismiss');
  }

  const admin = createServiceRoleClient();

  // Build query to delete matching notifications
  let query = admin.from('notifications').delete().eq('recipient_id', user.id);

  if (url) {
    query = query.like('url', `${url}%`);
  }

  if (types && types.length > 0) {
    query = query.in('type', types);
  }

  const { error } = await query;

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
