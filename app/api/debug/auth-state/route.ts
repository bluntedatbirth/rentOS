import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export async function GET(_request: NextRequest) {
  if (process.env.DEBUG_ENDPOINTS_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const cookieStore = cookies();

    const sessionClient = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component — ignore
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: true,
          session: { has_session: false },
          _note: userError ? String(userError) : undefined,
        },
        { status: 200 }
      );
    }

    // Session info — no tokens or secrets
    const sessionInfo = {
      has_session: true,
      user_id: user.id,
      email: user.email ?? null,
      app_metadata: user.app_metadata ?? null,
      user_metadata: user.user_metadata ?? null,
      created_at: user.created_at ?? null,
    };

    // Profile via session (anon-key) client
    const { data: profileSession, error: profileSessionError } = await sessionClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profileViaSession = {
      found: !!profileSession,
      row: profileSession ?? null,
      error: profileSessionError
        ? ((profileSessionError as { code?: string }).code ?? String(profileSessionError))
        : null,
    };

    // Profile via service-role client (full row)
    const serviceClient = createServiceRoleClient();
    const { data: profileService, error: profileServiceError } = await serviceClient
      .from('profiles')
      .select('id, role, full_name, phone, tier, tier_expires_at, founding_member, created_at')
      .eq('id', user.id)
      .single();

    const profileViaServiceRole = {
      found: !!profileService,
      row: profileService ?? null,
      error: profileServiceError
        ? ((profileServiceError as { code?: string }).code ?? String(profileServiceError))
        : null,
    };

    // RLS sanity check: can the session client select its own row at all?
    const { data: rlsTest, error: rlsError } = await sessionClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    const rlsPoliciesSample = {
      can_select_own_via_session: !!rlsTest,
      test_query_result: rlsTest ? 'row_returned' : rlsError ? String(rlsError) : 'no_row',
    };

    // Env presence — never expose actual key values
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const urlHost = supabaseUrl ? new URL(supabaseUrl).host : null;

    const env = {
      has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      has_supabase_url: !!supabaseUrl,
      supabase_url_host: urlHost,
    };

    return NextResponse.json(
      {
        ok: true,
        session: sessionInfo,
        profile_via_session_client: profileViaSession,
        profile_via_service_role: profileViaServiceRole,
        rls_policies_sample: rlsPoliciesSample,
        env,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
