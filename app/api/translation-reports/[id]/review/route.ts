import { NextResponse } from 'next/server';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  forbidden,
  serverError,
} from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

const reviewSchema = z.object({
  action: z.enum(['accept', 'reject', 'apply']),
});

const GLOSSARY_PATH = path.join(process.cwd(), 'locales', '_glossary.json');

interface GlossaryEntry {
  key: string;
  locale: string;
  accepted_value: string;
  accepted_at: string;
  reviewer: string;
}

interface Glossary {
  entries: GlossaryEntry[];
}

async function appendGlossary(entry: GlossaryEntry) {
  try {
    let glossary: Glossary = { entries: [] };
    try {
      const raw = await fs.readFile(GLOSSARY_PATH, 'utf-8');
      glossary = JSON.parse(raw) as Glossary;
    } catch {
      // File doesn't exist yet — start fresh
    }
    glossary.entries.push(entry);
    await fs.writeFile(GLOSSARY_PATH, JSON.stringify(glossary, null, 2), 'utf-8');
  } catch {
    // Filesystem errors must not block the DB update
  }
}

async function applyToLocaleFile(locale: string, key: string, suggestion: string) {
  const localePath = path.join(process.cwd(), 'locales', `${locale}.json`);
  const raw = await fs.readFile(localePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, string>;
  data[key] = suggestion;
  await fs.writeFile(localePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Admin check: try is_admin column, fall back to env allowlist
  let isAdmin = false;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();

    if (profile) {
      if ('is_admin' in profile && profile.is_admin === true) {
        isAdmin = true;
      } else {
        const allowlist = (process.env.ADMIN_USER_IDS ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        isAdmin = allowlist.includes(user.id);
      }
    }
  } catch {
    const allowlist = (process.env.ADMIN_USER_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    isAdmin = allowlist.includes(user.id);
  }

  if (!isAdmin) return forbidden();

  const body: unknown = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { action } = parsed.data;

  if (action === 'apply') {
    // Fetch the report first using service role to ensure we can read it
    const serviceClient = createServiceRoleClient();
    const { data: report, error: fetchErr } = await serviceClient
      .from('translation_reports')
      .select('locale, key, suggestion, status')
      .eq('id', params.id)
      .single();

    if (fetchErr || !report) return serverError('Report not found');
    if (report.status !== 'accepted') return badRequest('Can only apply accepted reports');
    if (!report.suggestion) return badRequest('No suggestion to apply');

    try {
      await applyToLocaleFile(report.locale, report.key, report.suggestion);
    } catch (err) {
      return serverError(
        `Failed to write locale file: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const { error: updateErr } = await serviceClient
      .from('translation_reports')
      .update({
        status: 'applied',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateErr) return serverError(updateErr.message);
    return NextResponse.json({ ok: true, applied: true });
  }

  // accept or reject
  const newStatus = action === 'accept' ? 'accepted' : 'rejected';

  const { error } = await supabase
    .from('translation_reports')
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  if (error) {
    return serverError(error.message);
  }

  // On accept, append to glossary (best-effort)
  if (action === 'accept') {
    const serviceClient = createServiceRoleClient();
    const { data: report } = await serviceClient
      .from('translation_reports')
      .select('locale, key, suggestion')
      .eq('id', params.id)
      .single();

    if (report?.suggestion) {
      await appendGlossary({
        key: report.key,
        locale: report.locale,
        accepted_value: report.suggestion,
        accepted_at: new Date().toISOString(),
        reviewer: user.id,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
