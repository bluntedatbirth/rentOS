import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

// DELETE /api/properties/[id]/images/[imageId]
// Remove a property image from storage and the database
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { id: propertyId, imageId } = await params;

  const adminClient = createServiceRoleClient();

  // Fetch the image and verify ownership in one query
  const { data: image, error: fetchError } = await adminClient
    .from('property_images')
    .select('id, landlord_id, storage_path, property_id')
    .eq('id', imageId)
    .eq('property_id', propertyId)
    .single();

  if (fetchError || !image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  if (image.landlord_id !== user.id) {
    return unauthorized();
  }

  try {
    // Remove from storage first
    const { error: storageError } = await adminClient.storage
      .from('property-images')
      .remove([image.storage_path]);

    if (storageError) {
      return serverError('Failed to remove from storage: ' + storageError.message);
    }

    // Delete the DB row
    const { error: deleteError } = await adminClient
      .from('property_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      return serverError('Failed to delete image record: ' + deleteError.message);
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return serverError(message);
  }
}
