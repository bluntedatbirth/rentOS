import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, notFound, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSignedDocumentUrl } from '@/lib/storage/signedUrl';

// GET /api/documents/[id]
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const { data, error } = await supabase
    .from('documents')
    .select('*, properties(name)')
    .eq('id', id)
    .single();

  if (error || !data) return notFound('Document not found');

  // PDPA: documents bucket is private. Replace stored public_url with a fresh signed URL.
  const signedUrl = data.storage_path
    ? await getSignedDocumentUrl(data.storage_path, 'documents', 3600)
    : null;

  return NextResponse.json({ ...data, public_url: signedUrl });
}

// DELETE /api/documents/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id } = await params;

  // Fetch the document — RLS will ensure only the landlord can see it
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, landlord_id, storage_path')
    .eq('id', id)
    .single();

  if (fetchError || !doc) return notFound('Document not found');

  if (doc.landlord_id !== user.id) return unauthorized();

  const adminClient = createServiceRoleClient();

  // Remove from storage
  const { error: storageError } = await adminClient.storage
    .from('documents')
    .remove([doc.storage_path]);

  if (storageError) {
    return serverError('Failed to delete from storage: ' + storageError.message);
  }

  // Remove from DB
  const { error: deleteError } = await adminClient.from('documents').delete().eq('id', id);

  if (deleteError) {
    return serverError('Failed to delete document record: ' + deleteError.message);
  }

  return new NextResponse(null, { status: 204 });
}
