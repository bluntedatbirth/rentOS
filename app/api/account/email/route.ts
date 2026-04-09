import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const { email } = body as { email?: string };

  if (!email || !email.includes('@')) {
    return badRequest('A valid email address is required.');
  }

  // Use the authenticated user's session to request an email change.
  // Supabase will send a confirmation email to the new address.
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({
    success: true,
    message: 'Verification email sent to your new address.',
  });
}
