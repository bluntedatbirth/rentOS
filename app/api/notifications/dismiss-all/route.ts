import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DELETE /api/notifications/dismiss-all
 * Delete all notifications for the current user.
 */
export async function DELETE() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const admin = createServiceRoleClient();

  const { error } = await admin.from('notifications').delete().eq('recipient_id', user.id);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
