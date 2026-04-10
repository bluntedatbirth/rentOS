import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit/persistent';
import { sendEmail } from '@/lib/email/send';
import { passwordResetTemplate } from '@/lib/email/templates/passwordReset';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { email } = parsed.data;
  const origin = new URL(request.url).origin;

  // Rate limit keyed by email
  const rl = await checkRateLimit(email, 'auth/password-reset', 3, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const admin = createServiceRoleClient();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${origin}/auth/reset-password`,
    },
  });

  // If user not found or any generate error — still return 200 to avoid leaking account existence
  if (linkError || !linkData?.properties?.action_link) {
    console.warn('[password-reset] generateLink did not produce a link', linkError?.message);
    return NextResponse.json({ ok: true });
  }

  const actionUrl = linkData.properties.action_link;

  const result = await sendEmail({
    to: email,
    kind: 'password_reset',
    ...passwordResetTemplate({ actionUrl, email }),
  });

  if (!result.ok) {
    console.error('[password-reset] sendEmail failed', result.error);
    // Still 200 — don't leak whether the user exists
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
