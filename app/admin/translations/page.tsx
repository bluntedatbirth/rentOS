/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: DELETE during scale-back cleanup (see SIMPLIFICATION_PROGRESS.md). This route is dead code from the cut feature set.
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminTranslationsClient } from './AdminTranslationsClient';

async function isAdminUser(userId: string): Promise<boolean> {
  // Try env allowlist first (fast path)
  const allowlist = (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.includes(userId)) return true;

  // Try profiles.is_admin column (may not exist)
  try {
    const serviceClient = createServiceRoleClient();
    const { data } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    if (data && 'is_admin' in data && data.is_admin === true) return true;
  } catch {
    // Column doesn't exist — fall through
  }

  return false;
}

export default async function AdminTranslationsPage() {
  const { user } = await getAuthenticatedUser();
  if (!user) {
    redirect('/auth/login');
  }

  const admin = await isAdminUser(user.id);

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal-50">
        <div className="rounded-xl border border-charcoal-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-charcoal-900">Access denied</p>
          <p className="mt-2 text-sm text-charcoal-500">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  // Fetch all reports via service role client
  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from('translation_reports')
    .select(
      'id, locale, key, current_value, suggestion, user_id, status, created_at, reviewed_by, reviewed_at'
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal-50">
        <div className="rounded-xl border border-charcoal-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-error-600">Failed to load reports</p>
          <p className="mt-2 text-sm text-charcoal-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return <AdminTranslationsClient initialReports={data ?? []} />;
}
