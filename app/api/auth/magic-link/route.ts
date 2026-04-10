import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit/persistent';
import { sendEmail } from '@/lib/email/send';
import { magicLinkTemplate } from '@/lib/email/templates/magicLink';

const bodySchema = z.object({
  email: z.string().email(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

  const { email, metadata } = parsed.data;
  const origin = new URL(request.url).origin;

  // Rate limit keyed by email (used as userId-equivalent for unauthenticated flow)
  const rl = await checkRateLimit(email, 'auth/magic-link', 3, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const admin = createServiceRoleClient();

  // `magiclink` type creates the user if they don't exist and mints a sign-in link.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      data: metadata,
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[magic-link] generateLink failed', linkError);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }

  const actionUrl = linkData.properties.action_link;
  const role = (metadata?.role as 'landlord' | 'tenant' | undefined) ?? 'landlord';

  const result = await sendEmail({
    to: email,
    kind: 'magic_link',
    ...magicLinkTemplate({ actionUrl, email, role }),
  });

  if (!result.ok) {
    console.error('[magic-link] sendEmail failed', result.error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
