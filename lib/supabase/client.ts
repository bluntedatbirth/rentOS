import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

type AppSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;
let client: AppSupabaseClient | null = null;

export function createClient(): AppSupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    client = createBrowserClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
    return client;
  }

  client = createBrowserClient<Database>(url, key, {
    auth: {
      flowType: 'implicit',
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      // Bypass navigator.locks which hangs in some embedded browsers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: async (_name: string, _acquireTimeout: number, fn: () => any) => {
        return await fn();
      },
    },
  });
  return client;
}
