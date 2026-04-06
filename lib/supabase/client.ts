import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key) {
    // Return a mock-like client that won't crash in dev without env vars
    // All auth/db calls will fail gracefully
    return createBrowserClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
  }

  return createBrowserClient<Database>(url, key);
}
