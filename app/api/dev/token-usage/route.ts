import { NextResponse } from 'next/server';
import { getTokenUsage } from '@/lib/claude/tokenTracker';

export async function GET() {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const summary = getTokenUsage();
  return NextResponse.json(summary);
}
