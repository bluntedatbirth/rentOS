import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Block dev routes in production
  if (pathname.startsWith('/api/dev') && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  // API routes — skip middleware (handled by route handlers)
  if (pathname.startsWith('/api/')) {
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
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        const dashboardUrl =
          profile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
    }
    return response;
  }

  // Protected routes — require auth
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based routing
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    // No profile yet — redirect to signup
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  // Block wrong-role access
  // Landlord-only routes: /landlord/*, including /landlord/dashboard, /landlord/billing/*, /landlord/onboarding
  if (pathname.startsWith('/landlord') && profile.role !== 'landlord') {
    return NextResponse.redirect(new URL('/tenant/dashboard', request.url));
  }
  // Tenant-only routes: /tenant/*, including /tenant/dashboard, /tenant/onboarding
  if (pathname.startsWith('/tenant') && profile.role !== 'tenant') {
    return NextResponse.redirect(new URL('/landlord/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
