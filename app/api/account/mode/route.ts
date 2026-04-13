import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

const modeSchema = z.object({
  active_mode: z.enum(['landlord', 'tenant']),
});

export async function PATCH(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = modeSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { error } = await supabase
    .from('profiles')
    .update({ active_mode: parsed.data.active_mode })
    .eq('id', user.id);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ active_mode: parsed.data.active_mode });
}
