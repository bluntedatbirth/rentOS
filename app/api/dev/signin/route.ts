import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isDevEndpointAllowed } from '@/lib/devGuard';

// DEV ONLY — password sign-in that sets session cookies
export async function GET() {
  if (!isDevEndpointAllowed()) return new Response(null, { status: 404 });

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: 'landlord@rentos.dev',
    password: 'test123456',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Redirect to dashboard after sign-in
  return NextResponse.redirect(new URL('/landlord/dashboard', process.env.NEXT_PUBLIC_API_URL!));
}
