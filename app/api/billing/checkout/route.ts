import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

const checkoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

export async function POST(request: Request) {
  if (process.env.ALLOW_MOCK_CHECKOUT !== 'true') {
    return NextResponse.json({ error: 'not_available' }, { status: 403 });
  }

  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const body: unknown = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { plan } = parsed.data;
  const adminClient = createServiceRoleClient();

  // --- Omise integration goes here (production) ---
  // const omise = require('omise')({ secretKey: process.env.OMISE_SECRET_KEY });
  // const customer = await omise.customers.create({ email: user.email });
  // const schedule = await omise.schedules.create({
  //   every: 1,
  //   period: plan === 'yearly' ? 'year' : 'month',
  //   on: { day_of_month: [new Date().getDate()] },
  //   end_date: '2099-12-31',
  //   charge: { customer: customer.id, amount: plan === 'yearly' ? 199000 : 19900, currency: 'THB' },
  // });
  // Update omise_customer_id and omise_schedule_id in profiles
  // ---------------------------------------------------

  // Alpha: mock checkout — directly upgrade tier
  const tierExpiresAt =
    plan === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await adminClient
    .from('profiles')
    .update({
      tier: 'pro',
      billing_cycle: plan,
      tier_expires_at: tierExpiresAt,
    })
    .eq('id', user.id);

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json({
    success: true,
    tier: 'pro',
    billing_cycle: plan,
    tier_expires_at: tierExpiresAt,
  });
}
