import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const propertyId = formData.get('property_id') as string | null;

  if (!file) {
    return badRequest('No file provided');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return badRequest('Unsupported file type');
  }

  // Validate file size (20MB)
  if (file.size > 20 * 1024 * 1024) {
    return badRequest('File too large. Maximum size is 20MB.');
  }

  const adminClient = createServiceRoleClient();

  try {
    // 1. Upload file to Supabase Storage
    const ext = file.name.split('.').pop() ?? 'jpg';
    const isAutoDetect = !propertyId || propertyId === 'auto';
    const folder = isAutoDetect ? 'pending' : propertyId;
    const storagePath = `${folder}/${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from('contracts')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return serverError('Upload failed: ' + uploadError.message);
    }

    // 2. For auto-detect, create a placeholder property
    let propertyIdForInsert = propertyId ?? '';
    if (isAutoDetect) {
      const { data: placeholder, error: placeholderError } = await adminClient
        .from('properties')
        .insert({
          landlord_id: user.id,
          name: 'Detecting from contract...',
          address: '',
        })
        .select('id')
        .single();

      if (placeholderError || !placeholder) {
        return serverError('Failed to create placeholder property');
      }
      propertyIdForInsert = placeholder.id;
    }

    // 3. Create contract record
    const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';

    const { data: urlData } = adminClient.storage.from('contracts').getPublicUrl(storagePath);

    const { data: contract, error: contractError } = await adminClient
      .from('contracts')
      .insert({
        property_id: propertyIdForInsert,
        landlord_id: user.id,
        original_file_url: urlData.publicUrl,
        file_type: fileType as 'image' | 'pdf',
      })
      .select()
      .single();

    if (contractError || !contract) {
      return serverError('Failed to create contract: ' + (contractError?.message ?? 'unknown'));
    }

    return NextResponse.json({
      contract_id: contract.id,
      storage_path: storagePath,
      file_type: fileType,
      property_id: propertyIdForInsert,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return serverError(message);
  }
}
