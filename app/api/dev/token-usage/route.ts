import { NextResponse } from 'next/server';
import { getTokenUsage } from '@/lib/claude/tokenTracker';
import { isDevEndpointAllowed } from '@/lib/devGuard';

export async function GET() {
  // Only available in development
  if (!isDevEndpointAllowed()) return new Response(null, { status: 404 });

  const summary = getTokenUsage();
  return NextResponse.json(summary);
}
