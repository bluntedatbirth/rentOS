import { createServerSupabaseClient } from './server';
import type { User } from '@supabase/supabase-js';
import type { Database } from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// Only the columns the UI actually needs — avoids select('*') on every request.
export type SessionProfile = Pick<
  ProfileRow,
  'id' | 'role' | 'full_name' | 'phone' | 'tier' | 'created_at'
>;

export interface ServerSession {
  user: User | null;
  profile: SessionProfile | null;
}

/**
 * Reads the Supabase auth cookie from the incoming request (via next/headers),
 * then fetches the caller's profile row with a scoped SELECT.
 *
 * Safe to call from any async Server Component.
 * Never throws — returns { user: null, profile: null } on any error.
 */
export async function getServerSession(): Promise<ServerSession> {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { user: null, profile: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, tier, created_at')
      .eq('id', user.id)
      .single();

    // User exists in auth but has no profile row yet — valid transient state.
    return { user, profile: profile ?? null };
  } catch {
    // Cookie read errors, network errors, etc. — degrade gracefully.
    return { user: null, profile: null };
  }
}
