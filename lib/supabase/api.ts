import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export function createApiClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
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
            // Ignored in read-only contexts
          }
        },
      },
    }
  );
}

export async function getAuthenticatedUser() {
  const supabase = createApiClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { user: null, supabase };
  }

  return { user: session.user, supabase };
}

// Re-export error utilities from the shared module
export {
  unauthorized,
  badRequest,
  notFound,
  forbidden,
  serverError,
  apiError,
} from '@/lib/apiErrors';
