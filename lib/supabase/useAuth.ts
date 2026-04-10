'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from './client';
import type { User } from '@supabase/supabase-js';
import type { Database } from './types';

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'role' | 'full_name' | 'phone' | 'tier' | 'language' | 'created_at' | 'purchased_slots'
>;

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

const supabase = createClient();

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, full_name, phone, tier, language, created_at, purchased_slots')
          .eq('id', session.user.id)
          .single();

        setState({ user: session.user, profile, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, full_name, phone, tier, language, created_at, purchased_slots')
          .eq('id', session.user.id)
          .single();

        setState({ user: session.user, profile, loading: false });
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return { error: new Error('send_failed') };
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('send_failed') };
    }
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      metadata: {
        role: 'landlord' | 'tenant';
        full_name: string;
        phone: string;
        pair_code?: string;
      },
      password?: string
    ) => {
      if (password) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: metadata,
          },
        });
        if (!error) {
          // Fire-and-forget: send our own confirmation email via Resend
          void fetch('/api/auth/magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, metadata }),
          });
        }
        return { error };
      }
      // Passwordless: POST to our own magic-link endpoint
      try {
        const res = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, metadata }),
        });
        if (!res.ok) return { error: new Error('send_failed') };
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error('send_failed') };
      }
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return { error: new Error('send_failed') };
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('send_failed') };
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false });
    window.location.href = '/login';
  }, []);

  const signInWithOAuth = useCallback(
    async (
      provider: 'google' | 'facebook' | 'apple',
      opts?: { role?: 'landlord' | 'tenant'; pairCode?: string }
    ): Promise<{ error: Error | null }> => {
      // Store role/pairCode in short-lived cookies so the redirectTo can be a
      // clean path with NO query string. Supabase's Redirect URLs allowlist
      // matcher has been observed to fall back to Site URL when the redirectTo
      // carries query params, even though the docs claim query params are
      // ignored. Cookies survive the OAuth redirect chain and are read by
      // /auth/callback server-side to resolve the role.
      if (typeof document !== 'undefined') {
        if (opts?.role) {
          document.cookie = `oauth_role=${opts.role}; path=/; max-age=600; SameSite=Lax`;
        }
        if (opts?.pairCode) {
          document.cookie = `oauth_pair=${encodeURIComponent(opts.pairCode)}; path=/; max-age=600; SameSite=Lax`;
        }
      }
      const redirectTo = `${window.location.origin}/auth/callback`;
      // Temporary diagnostic — visible in browser DevTools console during the
      // OAuth button click. Safe to remove once the flow is confirmed stable.
      console.log('[oauth] signInWithOAuth', {
        provider,
        redirectTo,
        role: opts?.role,
        pairCode: opts?.pairCode,
      });
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      return { error: error ?? null };
    },
    []
  );

  return {
    ...state,
    signInWithOtp,
    signInWithPassword,
    signUp,
    signOut,
    signInWithOAuth,
    sendPasswordReset,
  };
}
