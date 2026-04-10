import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';
import { sendEmail } from '@/lib/email/send';
import { welcomeOauthTemplate } from '@/lib/email/templates/welcomeOauth';

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
      error: exchangeError,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !session) {
      console.error('[callback] exchangeCodeForSession failed', exchangeError);
      return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin));
    }

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

        // Role resolution: query param → metadata → default 'landlord'
        const queryRole = requestUrl.searchParams.get('role');
        const resolvedRole: 'landlord' | 'tenant' =
          queryRole === 'landlord' || queryRole === 'tenant'
            ? queryRole
            : metadata.role === 'tenant'
              ? 'tenant'
              : 'landlord';

        // Defensive full_name mapping: Google may return `full_name`, Facebook/Apple return `name`
        const fullName =
          typeof metadata.full_name === 'string' && metadata.full_name
            ? metadata.full_name
            : typeof metadata.name === 'string' && metadata.name
              ? metadata.name
              : null;

        // Beta: grant Pro for 1 year to all new signups
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        await adminClient.from('profiles').upsert(
          {
            id: session.user.id,
            role: resolvedRole,
            full_name: fullName,
            phone: (metadata.phone as string) || null,
            language: 'th' as const,
            tier: 'pro' as const,
            tier_expires_at: oneYearFromNow.toISOString(),
            founding_member: true,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );

        // Fresh OAuth signup → fire welcome email (non-blocking)
        const provider = session.user.app_metadata.provider;
        if (provider && provider !== 'email') {
          const dashboard =
            resolvedRole === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
          const dashboardUrl = `${requestUrl.origin}${dashboard}`;
          void sendEmail({
            to: session.user.email!,
            kind: 'welcome_oauth',
            ...welcomeOauthTemplate({ fullName, role: resolvedRole, dashboardUrl }),
          });
        }

        // pair_code resolution: query param → metadata
        const queryPair = requestUrl.searchParams.get('pair');
        const pairCode =
          typeof queryPair === 'string' && queryPair
            ? queryPair.toUpperCase()
            : typeof metadata.pair_code === 'string'
              ? metadata.pair_code
              : null;

        // If the new tenant signed up via a QR pair link, drop them directly into
        // the pair page so the code is auto-redeemed before they hit the dashboard.
        if (resolvedRole === 'tenant' && pairCode && /^[A-Z0-9]{6}$/.test(pairCode)) {
          return NextResponse.redirect(new URL(`/tenant/pair?code=${pairCode}`, requestUrl.origin));
        }

        const dashboard = resolvedRole === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
        return NextResponse.redirect(new URL(dashboard, requestUrl.origin));
      }

      // Existing profile: still honour pair_code — check query param first, then metadata
      const metadata = session.user.user_metadata;
      const queryPair = requestUrl.searchParams.get('pair');
      const pairCode =
        typeof queryPair === 'string' && queryPair
          ? queryPair.toUpperCase()
          : typeof metadata?.pair_code === 'string'
            ? metadata.pair_code
            : null;
      if (existingProfile.role === 'tenant' && pairCode && /^[A-Z0-9]{6}$/.test(pairCode)) {
        return NextResponse.redirect(new URL(`/tenant/pair?code=${pairCode}`, requestUrl.origin));
      }

      // Redirect based on existing profile role
      const dashboard =
        existingProfile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
      return NextResponse.redirect(new URL(dashboard, requestUrl.origin));
    }
  }

  // If no code or session, redirect to login
  return NextResponse.redirect(new URL('/login?error=missing_code', requestUrl.origin));
}
