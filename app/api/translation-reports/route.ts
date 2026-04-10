import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  forbidden,
  serverError,
} from '@/lib/supabase/api';

const createReportSchema = z.object({
  locale: z.enum(['th', 'en', 'zh']),
  key: z.string().min(1),
  current_value: z.string().min(1),
  suggestion: z.string().optional(),
});

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { data, error } = await supabase
    .from('translation_reports')
    .insert({
      locale: parsed.data.locale,
      key: parsed.data.key,
      current_value: parsed.data.current_value,
      suggestion: parsed.data.suggestion ?? null,
      user_id: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({ id: data.id });
}

export async function GET() {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Admin check: role === 'landlord' (no is_admin column yet)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return unauthorized();
  if (profile.role !== 'landlord') return forbidden();

  const { data, error } = await supabase
    .from('translation_reports')
    .select('id, locale, key, current_value, suggestion, user_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}
