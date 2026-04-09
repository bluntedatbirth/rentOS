import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Map MIME type to a clean file extension
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

// GET /api/properties/[id]/images
// List all images for a property (RLS applied via user-scoped client)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id: propertyId } = await params;

  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    return serverError(error.message);
  }

  return NextResponse.json(data);
}

// POST /api/properties/[id]/images
// Upload a new property image
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id: propertyId } = await params;

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('Invalid form data');
  }

  const file = formData.get('file') as File | null;
  const category = formData.get('category') as string | null;

  if (!file) {
    return badRequest('No file provided');
  }

  if (!category || (category !== 'move_in' && category !== 'move_out')) {
    return badRequest('category must be move_in or move_out');
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return badRequest('Unsupported file type. Only JPEG, PNG, and WebP are allowed.');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return badRequest('File too large. Maximum size is 10MB.');
  }

  const adminClient = createServiceRoleClient();

  // Verify the caller owns this property
  const { data: property, error: propertyError } = await adminClient
    .from('properties')
    .select('id, landlord_id')
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  if (property.landlord_id !== user.id) {
    return unauthorized();
  }

  try {
    // Build storage path: {propertyId}/{category}/{uuid}.{ext}
    const ext = extFromMime(file.type);
    const imageId = crypto.randomUUID();
    const storagePath = `${propertyId}/${category}/${imageId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from('property-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return serverError('Storage upload failed: ' + uploadError.message);
    }

    // Get the public URL
    const { data: urlData } = adminClient.storage.from('property-images').getPublicUrl(storagePath);

    // Insert the DB record
    const { data: image, error: insertError } = await adminClient
      .from('property_images')
      .insert({
        property_id: propertyId,
        landlord_id: user.id,
        category: category as 'move_in' | 'move_out',
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        file_name: file.name ?? null,
        file_size: file.size,
      })
      .select()
      .single();

    if (insertError || !image) {
      // Attempt to clean up the orphaned storage object
      await adminClient.storage.from('property-images').remove([storagePath]);
      return serverError('Failed to save image record: ' + (insertError?.message ?? 'unknown'));
    }

    return NextResponse.json(image, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return serverError(message);
  }
}
