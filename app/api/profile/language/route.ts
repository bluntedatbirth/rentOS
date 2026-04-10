import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

const languageSchema = z.object({
  language: z.enum(['th', 'en', 'zh']),
});

export async function PATCH(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = languageSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { error } = await supabase
    .from('profiles')
    .update({ language: parsed.data.language })
    .eq('id', user.id);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ ok: true });
}
