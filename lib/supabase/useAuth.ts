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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
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
        return { error };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: metadata,
        },
      });
      return { error };
    },
    []
  );

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
      const role = opts?.role ?? '';
      const pairPart = opts?.pairCode ? `&pair=${encodeURIComponent(opts.pairCode)}` : '';
      const redirectTo = `${window.location.origin}/auth/callback?role=${role}${pairPart}`;
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
  };
}
