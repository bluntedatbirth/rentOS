import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Service-role fallback: used when the anon-key session client returns null for
// a logged-in user's profile (most likely due to RLS policy missing on the live DB).
// Adds one extra DB round-trip ONLY in the failure case — no perf regression for
// the happy path.
async function getProfileViaServiceRole(userId: string): Promise<{ role: string } | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return null;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
  return data ?? null;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Skip auth checks if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
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

  // Block dev routes unless NODE_ENV is not production AND DEV_ENDPOINTS_ENABLED=true
  if (
    pathname.startsWith('/api/dev') &&
    (process.env.NODE_ENV === 'production' || process.env.DEV_ENDPOINTS_ENABLED !== 'true')
  ) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

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
        .select('role')
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
          profile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
        console.log('[middleware]', {
          pathname,
          has_user: true,
          profile_via_session_client: profileViaSession,
          profile_via_service_role: profileViaServiceRole,
          redirect_target: dashboardUrl,
        });
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }

      console.log('[middleware]', {
        pathname,
        has_user: true,
        profile_via_session_client: profileViaSession,
        profile_via_service_role: profileViaServiceRole,
        redirect_target: 'passthrough',
      });
    } else {
      console.log('[middleware]', {
        pathname,
        has_user: false,
        profile_via_session_client: null,
        profile_via_service_role: null,
        redirect_target: 'passthrough',
      });
    }
    return response;
  }

  // Protected route prefixes — only these require auth.
  // Unknown paths fall through to Next.js so app/not-found.tsx can render.
  const protectedPrefixes = ['/landlord', '/tenant', '/admin'];
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) {
    console.log('[middleware]', {
      pathname,
      has_user: !!user,
      profile_via_session_client: null,
      profile_via_service_role: null,
      redirect_target: 'passthrough',
    });
    return response;
  }

  if (!user) {
    console.log('[middleware]', {
      pathname,
      has_user: false,
      profile_via_session_client: null,
      profile_via_service_role: null,
      redirect_target: '/login',
    });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based routing
  let { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

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
    // No profile yet — redirect to signup
    console.log('[middleware]', {
      pathname,
      has_user: true,
      profile_via_session_client: profileViaSession,
      profile_via_service_role: profileViaServiceRole,
      redirect_target: '/signup',
    });
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  // Block wrong-role access
  // Landlord-only routes: /landlord/*, including /landlord/dashboard, /landlord/billing/*, /landlord/onboarding
  if (pathname.startsWith('/landlord') && profile.role !== 'landlord') {
    console.log('[middleware]', {
      pathname,
      has_user: true,
      profile_via_session_client: profileViaSession,
      profile_via_service_role: profileViaServiceRole,
      redirect_target: '/tenant/dashboard',
    });
    return NextResponse.redirect(new URL('/tenant/dashboard', request.url));
  }
  // Tenant-only routes: /tenant/*, including /tenant/dashboard, /tenant/onboarding
  if (pathname.startsWith('/tenant') && profile.role !== 'tenant') {
    console.log('[middleware]', {
      pathname,
      has_user: true,
      profile_via_session_client: profileViaSession,
      profile_via_service_role: profileViaServiceRole,
      redirect_target: '/landlord/dashboard',
    });
    return NextResponse.redirect(new URL('/landlord/dashboard', request.url));
  }

  console.log('[middleware]', {
    pathname,
    has_user: true,
    profile_via_session_client: profileViaSession,
    profile_via_service_role: profileViaServiceRole,
    redirect_target: 'passthrough',
  });
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
