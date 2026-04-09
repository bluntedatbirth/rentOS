import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any };

interface TemplateRow {
  id: string;
  is_system: boolean;
  landlord_id: string | null;
  name_en: string;
  name_th: string;
  description_en: string | null;
  description_th: string | null;
  template_text: string;
  category: string;
  created_at: string;
}

// GET /api/contract-templates/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const serviceClient = createServiceRoleClient();

  const { data, error } = (await (serviceClient as unknown as AnyClient)
    .from('contract_templates')
    .select('*')
    .eq('id', params.id)
    .single()) as { data: TemplateRow | null; error: unknown };

  if (error || !data) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Only allow access to system templates or own templates
  if (!data.is_system && data.landlord_id !== user.id) {
    return unauthorized();
  }

  return NextResponse.json({ template: data });
}

// PATCH /api/contract-templates/[id]
// Update a custom template (custom only — system templates are immutable)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const serviceClient = createServiceRoleClient();

  const { data: existing, error: fetchError } = (await (serviceClient as unknown as AnyClient)
    .from('contract_templates')
    .select('id, is_system, landlord_id')
    .eq('id', params.id)
    .single()) as {
    data: Pick<TemplateRow, 'id' | 'is_system' | 'landlord_id'> | null;
    error: unknown;
  };

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (existing.is_system) {
    return NextResponse.json({ error: 'System templates cannot be modified' }, { status: 403 });
  }

  if (existing.landlord_id !== user.id) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { name_en, name_th, description_en, description_th, template_text, category } =
    body as Record<string, string | undefined>;

  if (category) {
    const validCategories = ['residential', 'condo', 'furnished', 'short_term', 'commercial'];
    if (!validCategories.includes(category)) {
      return badRequest(`category must be one of: ${validCategories.join(', ')}`);
    }
  }

  const updates: Record<string, string | null> = {};
  if (name_en !== undefined) updates.name_en = name_en.trim();
  if (name_th !== undefined) updates.name_th = name_th.trim();
  if (description_en !== undefined) updates.description_en = description_en?.trim() ?? null;
  if (description_th !== undefined) updates.description_th = description_th?.trim() ?? null;
  if (template_text !== undefined) updates.template_text = template_text.trim();
  if (category !== undefined) updates.category = category;

  const { data, error } = (await (serviceClient as unknown as AnyClient)
    .from('contract_templates')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()) as { data: TemplateRow | null; error: { message: string } | null };

  if (error) {
    console.error('[contract-templates PATCH]', error.message);
    return serverError('Failed to update template');
  }

  return NextResponse.json({ template: data });
}

// DELETE /api/contract-templates/[id]
// Delete a custom template (custom only)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const serviceClient = createServiceRoleClient();

  const { data: existing, error: fetchError } = (await (serviceClient as unknown as AnyClient)
    .from('contract_templates')
    .select('id, is_system, landlord_id')
    .eq('id', params.id)
    .single()) as {
    data: Pick<TemplateRow, 'id' | 'is_system' | 'landlord_id'> | null;
    error: unknown;
  };

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (existing.is_system) {
    return NextResponse.json({ error: 'System templates cannot be deleted' }, { status: 403 });
  }

  if (existing.landlord_id !== user.id) {
    return unauthorized();
  }

  const { error } = (await (serviceClient as unknown as AnyClient)
    .from('contract_templates')
    .delete()
    .eq('id', params.id)) as { error: { message: string } | null };

  if (error) {
    console.error('[contract-templates DELETE]', error.message);
    return serverError('Failed to delete template');
  }

  return new NextResponse(null, { status: 204 });
}
