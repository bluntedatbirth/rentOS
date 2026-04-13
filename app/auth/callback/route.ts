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

  // Debug mode: gate on env flag AND explicit query param so it can't be hit accidentally
  const isDebug =
    process.env.DEBUG_ENDPOINTS_ENABLED === 'true' && requestUrl.searchParams.get('debug') === '1';

  // Diagnostic accumulator — populated throughout the handler; always logged to Vercel
  const diag: Record<string, unknown> = {
    code_present: !!code,
  };

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

    diag.exchange_error = exchangeError ? String(exchangeError) : null;
    diag.has_session = !!session;
    diag.user_id = session?.user?.id ?? null;

    if (exchangeError || !session) {
      console.error('[callback] exchangeCodeForSession failed', exchangeError);
      diag.final_redirect = '/login?error=oauth_failed';
      if (process.env.NODE_ENV === 'development') console.log('[callback-diag]', diag);
      return NextResponse.redirect(new URL('/login?error=oauth_failed', requestUrl.origin));
    }

    if (session?.user) {
      // Use service role client for profile operations (bypasses RLS)
      const adminClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Check if profile exists
      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .single();

      diag.existing_profile_query_result = existingProfile
        ? { id: existingProfile.id, role: existingProfile.role }
        : null;
      diag.existing_profile_query_error = existingProfileError
        ? String(existingProfileError)
        : null;

      if (!existingProfile) {
        const metadata = session.user.user_metadata;

        // Check if the role was explicitly chosen (from signup page → OAuth).
        // Cookie is set by the signup page before redirecting to Google.
        // If no role source exists, the user came directly to Google login
        // without going through signup — redirect them to signup to choose.
        const queryRole = requestUrl.searchParams.get('role');
        const cookieRoleRaw = cookieStore.get('oauth_role')?.value ?? null;
        const cookieRole =
          cookieRoleRaw === 'landlord' || cookieRoleRaw === 'tenant' ? cookieRoleRaw : null;
        const metadataRole = metadata?.role;

        const resolvedRole: 'landlord' | 'tenant' | null =
          queryRole === 'landlord' || queryRole === 'tenant'
            ? queryRole
            : cookieRole
              ? cookieRole
              : metadataRole === 'landlord' || metadataRole === 'tenant'
                ? metadataRole
                : null;

        // No role chosen → send to signup so user can pick
        if (!resolvedRole) {
          diag.final_redirect = '/signup?complete=1';
          console.log('[callback] no role found, redirecting to signup', diag);
          return NextResponse.redirect(new URL('/signup?complete=1', requestUrl.origin));
        }

        diag.resolved_role = resolvedRole;

        // Defensive full_name mapping: Google → `full_name` or `name`
        const fullName =
          typeof metadata.full_name === 'string' && metadata.full_name
            ? metadata.full_name
            : typeof metadata.name === 'string' && metadata.name
              ? metadata.name
              : null;

        // Beta: grant Pro for 1 year to all new signups
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        diag.upsert_attempted = true;
        const { error: upsertError } = await adminClient.from('profiles').upsert(
          {
            id: session.user.id,
            role: resolvedRole,
            active_mode: resolvedRole,
            full_name: fullName,
            phone: (metadata.phone as string) || null,
            language: 'th' as const,
            tier: 'pro' as const,
            tier_expires_at: oneYearFromNow.toISOString(),
            founding_member: true,
          },
          { onConflict: 'id' }
        );
        diag.upsert_error = upsertError ? String(upsertError) : null;
        if (upsertError) {
          console.error('[callback] profile upsert failed', upsertError);
        }

        // Fresh OAuth signup → fire welcome email (non-blocking)
        const provider = session.user.app_metadata.provider;
        if (provider && provider !== 'email') {
          const loginUrl = `${requestUrl.origin}/login`;
          void sendEmail({
            to: session.user.email!,
            kind: 'welcome_oauth',
            ...welcomeOauthTemplate({ fullName, role: resolvedRole, dashboardUrl: loginUrl }),
          });
        }

        // pair_code resolution: query param → cookie → metadata
        const queryPair = requestUrl.searchParams.get('pair');
        const cookiePairRaw = cookieStore.get('oauth_pair')?.value ?? null;
        const cookiePair = cookiePairRaw ? decodeURIComponent(cookiePairRaw).toUpperCase() : null;
        const pairCode =
          typeof queryPair === 'string' && queryPair
            ? queryPair.toUpperCase()
            : cookiePair
              ? cookiePair
              : typeof metadata.pair_code === 'string'
                ? metadata.pair_code
                : null;

        if (resolvedRole === 'tenant' && pairCode && /^[A-Z0-9]{6}$/.test(pairCode)) {
          const target = `/tenant/pair?code=${pairCode}`;
          diag.final_redirect = target;
          if (process.env.NODE_ENV === 'development') console.log('[callback-diag]', diag);
          if (isDebug) return debugHtmlResponse(diag, target, requestUrl.origin);
          return NextResponse.redirect(new URL(target, requestUrl.origin));
        }

        const dashboard = resolvedRole === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
        diag.final_redirect = dashboard;
        if (process.env.NODE_ENV === 'development') console.log('[callback-diag]', diag);
        if (isDebug) return debugHtmlResponse(diag, dashboard, requestUrl.origin);
        return NextResponse.redirect(new URL(dashboard, requestUrl.origin));
      }

      // Existing profile: still honour pair_code — query param → cookie → metadata
      const metadata = session.user.user_metadata;
      const queryPair = requestUrl.searchParams.get('pair');
      const cookiePairRaw = cookieStore.get('oauth_pair')?.value ?? null;
      const cookiePair = cookiePairRaw ? decodeURIComponent(cookiePairRaw).toUpperCase() : null;
      const pairCode =
        typeof queryPair === 'string' && queryPair
          ? queryPair.toUpperCase()
          : cookiePair
            ? cookiePair
            : typeof metadata?.pair_code === 'string'
              ? metadata.pair_code
              : null;

      diag.resolved_role = existingProfile.role;
      diag.upsert_attempted = false;

      if (existingProfile.role === 'tenant' && pairCode && /^[A-Z0-9]{6}$/.test(pairCode)) {
        const target = `/tenant/pair?code=${pairCode}`;
        diag.final_redirect = target;
        if (process.env.NODE_ENV === 'development') console.log('[callback-diag]', diag);
        if (isDebug) return debugHtmlResponse(diag, target, requestUrl.origin);
        return NextResponse.redirect(new URL(target, requestUrl.origin));
      }

      // Redirect based on existing profile role
      const dashboard =
        existingProfile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
      diag.final_redirect = dashboard;
      if (process.env.NODE_ENV === 'development') console.log('[callback-diag]', diag);
      if (isDebug) return debugHtmlResponse(diag, dashboard, requestUrl.origin);
      return NextResponse.redirect(new URL(dashboard, requestUrl.origin));
    }
  }

  // If no code or session, redirect to login
  diag.final_redirect = '/login?error=missing_code';
  console.log('[callback-diag]', diag);
  return NextResponse.redirect(new URL('/login?error=missing_code', requestUrl.origin));
}

/** Returns a plain HTML diagnostic page when debug mode is active. */
function debugHtmlResponse(
  diag: Record<string, unknown>,
  target: string,
  origin: string
): Response {
  const json = JSON.stringify(diag, null, 2);
  const continueUrl = `${origin}${target}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Callback Debug</title>
<style>body{font-family:monospace;padding:2rem;background:#0f0f0f;color:#e5e5e5}
pre{background:#1a1a1a;padding:1rem;border-radius:6px;overflow:auto;white-space:pre-wrap}
a{color:#facc15;font-size:1.1rem}</style></head>
<body>
<h2>Auth Callback — Debug Output</h2>
<pre>${escapeHtml(json)}</pre>
<p><a href="${continueUrl}">Continue to ${escapeHtml(target)}</a></p>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
