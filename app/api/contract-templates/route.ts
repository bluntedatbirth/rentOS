import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any };

// GET /api/contract-templates
// Returns all system templates + the authenticated landlord's custom templates
export async function GET() {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const serviceClient = createServiceRoleClient();

  const { data, error } = (await (serviceClient as unknown as AnyClient)
    .from('contract_templates')
    .select(
      'id, name_en, name_th, description_en, description_th, category, is_system, landlord_id, created_at'
    )
    .or(`is_system.eq.true,landlord_id.eq.${user.id}`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })) as {
    data: unknown[] | null;
    error: { message: string } | null;
  };

  if (error) {
    console.error('[contract-templates GET]', error.message);
    return serverError('Failed to fetch templates');
  }

  return NextResponse.json({ templates: data ?? [] });
}

// POST /api/contract-templates
// Creates a custom template — Pro feature
export async function POST(req: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Pro gate
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.tier ?? 'free';
  const tierCheck = requirePro(tier, 'custom_contract_templates');
  if (!tierCheck.allowed) {
    return NextResponse.json(
      { error: 'Pro plan required to create custom templates', upgradeUrl: tierCheck.upgradeUrl },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { name_en, name_th, description_en, description_th, template_text, category } =
    body as Record<string, string>;

  if (!name_en?.trim() || !name_th?.trim()) return badRequest('name_en and name_th are required');
  if (!template_text?.trim()) return badRequest('template_text is required');
  if (!category) return badRequest('category is required');

  const validCategories = ['residential', 'condo', 'furnished', 'short_term', 'commercial'];
  if (!validCategories.includes(category)) {
    return badRequest(`category must be one of: ${validCategories.join(', ')}`);
  }

  const serviceClient = createServiceRoleClient();

  const { data, error } = (await (serviceClient as unknown as AnyClient)
    .from('contract_templates')
    .insert({
      name_en: name_en.trim(),
      name_th: name_th.trim(),
      description_en: description_en?.trim() ?? null,
      description_th: description_th?.trim() ?? null,
      template_text: template_text.trim(),
      category,
      is_system: false,
      landlord_id: user.id,
    })
    .select()
    .single()) as { data: unknown; error: { message: string } | null };

  if (error) {
    console.error('[contract-templates POST]', error.message);
    return serverError('Failed to create template');
  }

  return NextResponse.json({ template: data }, { status: 201 });
}
