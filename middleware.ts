import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Service-role fallback: used when the anon-key session client returns null for
// a logged-in user's profile (most likely due to RLS policy missing on the live DB).
// Adds one extra DB round-trip ONLY in the failure case — no perf regression for
// the happy path.
async function getProfileViaServiceRole(
  userId: string
): Promise<{ role: string; active_mode: string } | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return null;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data } = await admin
    .from('profiles')
    .select('role, active_mode')
    .eq('id', userId)
    .single();
  return data ?? null;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Fail-closed: if Supabase is not configured, block all traffic
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // API routes — skip middleware (handled by route handlers)
  if (pathname.startsWith('/api/')) {
    return response;
  }

  // Legal pages — always public, never redirect even when logged in
  if (pathname === '/legal') {
    return response;
  }

  // Public routes — allow access without auth
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth/')
  ) {
    // If logged in and visiting public pages, redirect to dashboard
    if (user) {
      let { data: profile } = await supabase
        .from('profiles')
        .select('role, active_mode')
        .eq('id', user.id)
        .single();

      const profileViaSession = profile?.role ?? null;

      // Fallback: anon-key lookup may return null if RLS policy is missing on the
      // live DB. Try service-role client before giving up.
      let profileViaServiceRole: string | null = null;
      if (!profile) {
        profile = await getProfileViaServiceRole(user.id);
        profileViaServiceRole = profile?.role ?? null;
      }

      if (profile) {
        const dashboardUrl =
          (profile.active_mode ?? profile.role) === 'landlord'
            ? '/landlord/dashboard'
            : '/tenant/dashboard';
        if (process.env.NODE_ENV === 'development') {
          console.log('[middleware]', {
            pathname,
            has_user: true,
            profile_via_session_client: profileViaSession,
            profile_via_service_role: profileViaServiceRole,
            redirect_target: dashboardUrl,
          });
        }
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[middleware]', {
          pathname,
          has_user: true,
          profile_via_session_client: profileViaSession,
          profile_via_service_role: profileViaServiceRole,
          redirect_target: 'passthrough',
        });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[middleware]', {
          pathname,
          has_user: false,
          profile_via_session_client: null,
          profile_via_service_role: null,
          redirect_target: 'passthrough',
        });
      }
    }
    return response;
  }

  // Protected route prefixes — only these require auth.
  // Unknown paths fall through to Next.js so app/not-found.tsx can render.
  const protectedPrefixes = ['/landlord', '/tenant', '/admin'];
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[middleware]', {
        pathname,
        has_user: !!user,
        profile_via_session_client: null,
        profile_via_service_role: null,
        redirect_target: 'passthrough',
      });
    }
    return response;
  }

  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[middleware]', {
        pathname,
        has_user: false,
        profile_via_session_client: null,
        profile_via_service_role: null,
        redirect_target: '/login',
      });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based routing
  let { data: profile } = await supabase
    .from('profiles')
    .select('role, active_mode')
    .eq('id', user.id)
    .single();

  const profileViaSession = profile?.role ?? null;

  // Fallback: anon-key lookup may return null if RLS policy is missing on the
  // live DB (e.g., policy was never applied or was accidentally dropped).
  // Service-role client bypasses RLS — this is the belt-and-suspenders fix that
  // keeps the OAuth callback redirect loop from occurring while the migration is
  // being applied manually via the Supabase dashboard.
  let profileViaServiceRole: string | null = null;
  if (!profile) {
    profile = await getProfileViaServiceRole(user.id);
    profileViaServiceRole = profile?.role ?? null;
  }

  if (!profile) {
    // Auto-create missing profile from user metadata (safety net for failed callback)
    const metadata = user.user_metadata ?? {};
    const resolvedRole = metadata.role === 'tenant' ? 'tenant' : 'landlord';
    const fullName =
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : null;

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceKey && supabaseUrl) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: upsertData, error: upsertError } = await admin
        .from('profiles')
        .upsert(
          {
            id: user.id,
            role: resolvedRole,
            active_mode: resolvedRole,
            full_name: fullName,
            phone: (metadata.phone as string) || null,
            language: 'th',
            tier: 'pro',
            tier_expires_at: oneYearFromNow.toISOString(),
            founding_member: true,
          },
          { onConflict: 'id' }
        )
        .select('role, active_mode')
        .single();

      console.log('[middleware] profile upsert', {
        userId: user.id,
        upsertError: upsertError ? String(upsertError) : null,
        upsertData,
      });

      if (!upsertError && upsertData) {
        // Profile created — redirect to dashboard
        const dashboardUrl =
          (upsertData.active_mode ?? upsertData.role) === 'landlord'
            ? '/landlord/dashboard'
            : '/tenant/dashboard';
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
    } else {
      console.error(
        '[middleware] missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for profile upsert'
      );
    }

    // Fallback: sign the user out and redirect to login so they don't loop
    // (this only happens if profile creation fails AND service role is misconfigured)
    console.error('[middleware] profile creation failed, clearing session', {
      userId: user.id,
      profileViaSession,
      profileViaServiceRole,
    });
    return NextResponse.redirect(new URL('/login?error=profile_failed', request.url));
  }

  // Block wrong-role access
  // Landlord-only routes: /landlord/*, including /landlord/dashboard, /landlord/billing/*, /landlord/onboarding
  if (pathname.startsWith('/landlord') && (profile.active_mode ?? profile.role) !== 'landlord') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[middleware]', {
        pathname,
        has_user: true,
        profile_via_session_client: profileViaSession,
        profile_via_service_role: profileViaServiceRole,
        redirect_target: '/tenant/dashboard',
      });
    }
    return NextResponse.redirect(new URL('/tenant/dashboard', request.url));
  }
  // Tenant-only routes: /tenant/*, including /tenant/dashboard, /tenant/onboarding
  if (pathname.startsWith('/tenant') && (profile.active_mode ?? profile.role) !== 'tenant') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[middleware]', {
        pathname,
        has_user: true,
        profile_via_session_client: profileViaSession,
        profile_via_service_role: profileViaServiceRole,
        redirect_target: '/landlord/dashboard',
      });
    }
    return NextResponse.redirect(new URL('/landlord/dashboard', request.url));
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[middleware]', {
      pathname,
      has_user: true,
      profile_via_session_client: profileViaSession,
      profile_via_service_role: profileViaServiceRole,
      redirect_target: 'passthrough',
    });
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
