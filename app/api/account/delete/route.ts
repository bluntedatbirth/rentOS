import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const { confirmation } = body as { confirmation?: string };

  if (confirmation !== 'DELETE') {
    return badRequest('Confirmation text must be "DELETE"');
  }

  // Soft-delete: clear personal data from profile
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: '[Deleted]',
      phone: null,
    })
    .eq('id', user.id);

  if (error) {
    return serverError(error.message);
  }

  // Sign the user out
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
