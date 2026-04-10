import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';
import { getLandlordAnalytics } from '@/lib/analytics/getLandlordAnalytics';

export async function GET() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const result = await getLandlordAnalytics(user.id);

  if (!result.ok) {
    if (result.blocked) {
      return NextResponse.json(
        { allowed: false, reason: 'analytics', upgradeUrl: '/landlord/billing/upgrade' },
        { status: 403 }
      );
    }
    return serverError(result.error);
  }

  return NextResponse.json(result.data);
}
