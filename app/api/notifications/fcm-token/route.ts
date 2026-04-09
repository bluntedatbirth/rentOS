import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

const schema = z.object({
  token: z.string().min(1, 'FCM token is required'),
});

/** POST /api/notifications/fcm-token — Save the user's FCM push token */
export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  // Use service role client to bypass RLS for profile update
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('profiles')
    .update({ fcm_token: parsed.data.token })
    .eq('id', user.id);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
