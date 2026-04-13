import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

// POST /api/properties/[id]/cover
// Upload or replace a property cover image
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id: propertyId } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('Invalid form data');
  }

  const file = formData.get('file') as File | null;

  if (!file) {
    return badRequest('No file provided');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return badRequest('Unsupported file type. Only JPEG, PNG, and WebP are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    return badRequest('File too large. Maximum size is 5MB.');
  }

  const adminClient = createServiceRoleClient();

  // Verify the caller owns this property
  const { data: property, error: propertyError } = await adminClient
    .from('properties')
    .select('id, landlord_id')
    .eq('id', propertyId)
    .eq('is_active', true)
    .single();

  if (propertyError || !property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  if (property.landlord_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const ext = extFromMime(file.type);
    // Scoped to landlord_id so RLS policy is satisfied
    const storagePath = `${user.id}/${propertyId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from('property-covers')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return serverError('Storage upload failed: ' + uploadError.message);
    }

    const { data: urlData } = adminClient.storage.from('property-covers').getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await adminClient
      .from('properties')
      .update({ cover_image_url: publicUrl })
      .eq('id', propertyId);

    if (updateError) {
      return serverError('Failed to update property: ' + updateError.message);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return serverError(message);
  }
}

// DELETE /api/properties/[id]/cover
// Remove a property cover image
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id: propertyId } = await params;

  const adminClient = createServiceRoleClient();

  // Verify the caller owns this property
  const { data: property, error: propertyError } = await adminClient
    .from('properties')
    .select('id, landlord_id, cover_image_url')
    .eq('id', propertyId)
    .eq('is_active', true)
    .single();

  if (propertyError || !property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  if (property.landlord_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Attempt to remove all possible extensions from storage
  const extensions = ['jpg', 'png', 'webp'];
  const pathsToRemove = extensions.map((ext) => `${user.id}/${propertyId}.${ext}`);
  // Ignore removal errors — the file may not exist for all extensions
  await adminClient.storage.from('property-covers').remove(pathsToRemove);

  const { error: updateError } = await adminClient
    .from('properties')
    .update({ cover_image_url: null })
    .eq('id', propertyId);

  if (updateError) {
    return serverError('Failed to clear cover image: ' + updateError.message);
  }

  return NextResponse.json({ success: true });
}
