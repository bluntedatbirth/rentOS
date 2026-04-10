import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { emailChangeTemplate } from '@/lib/email/templates/emailChange';

export async function POST(request: Request) {
  const { user, supabase: _supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const { email: newEmail } = body as { email?: string };

  if (!newEmail || !newEmail.includes('@')) {
    return badRequest('A valid email address is required.');
  }

  const origin = new URL(request.url).origin;
  const admin = createServiceRoleClient();

  // Generate an email_change_new link for the new address.
  // This requires `email` (current) and `newEmail` (target).
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'email_change_new',
    email: user.email!,
    newEmail,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[account/email] generateLink failed', linkError);
    return serverError('Failed to generate confirmation link.');
  }

  const actionUrl = linkData.properties.action_link;

  const result = await sendEmail({
    to: newEmail,
    kind: 'email_change',
    ...emailChangeTemplate({ actionUrl, oldEmail: user.email!, newEmail }),
  });

  if (!result.ok) {
    console.error('[account/email] sendEmail failed', result.error);
    return serverError('Failed to send confirmation email.');
  }

  return NextResponse.json({
    ok: true,
    message: 'Verification email sent to your new address.',
  });
}
