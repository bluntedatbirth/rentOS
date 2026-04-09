import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DELETE /api/notifications/[id]/dismiss
 * Permanently delete a notification (dismiss it from the user's inbox).
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Use service role client — RLS only allows SELECT/UPDATE on notifications, not DELETE
  const admin = createServiceRoleClient();

  const { error } = await admin
    .from('notifications')
    .delete()
    .eq('id', params.id)
    .eq('recipient_id', user.id);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
