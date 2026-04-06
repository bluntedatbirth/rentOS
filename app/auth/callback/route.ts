import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.exchangeCodeForSession(code);

    if (session?.user) {
      // Use service role client for profile operations (bypasses RLS)
      const adminClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Check if profile exists
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .single();

      if (!existingProfile) {
        // Auto-create profile from user metadata (set during signup)
        const metadata = session.user.user_metadata;
        const role: 'landlord' | 'tenant' = metadata.role === 'tenant' ? 'tenant' : 'landlord';

        await adminClient.from('profiles').insert({
          id: session.user.id,
          role,
          full_name: (metadata.full_name as string) || null,
          phone: (metadata.phone as string) || null,
          language: 'th' as const,
        });

        const dashboard = role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
        return NextResponse.redirect(new URL(dashboard, requestUrl.origin));
      }

      // Redirect based on existing profile role
      const dashboard =
        existingProfile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
      return NextResponse.redirect(new URL(dashboard, requestUrl.origin));
    }
  }

  // If no code or session, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
