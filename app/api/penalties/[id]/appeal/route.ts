import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

const appealSchema = z.object({
  tenant_appeal_note: z.string().min(1).max(2000),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = appealSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await supabase
    .from('penalties')
    .update({
      tenant_appeal_note: parsed.data.tenant_appeal_note,
      status: 'pending_tenant_appeal' as const,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}
