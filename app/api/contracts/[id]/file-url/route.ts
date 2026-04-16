import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/supabase/api';
import { getSignedDocumentUrl } from '@/lib/storage/signedUrl';

/**
 * GET /api/contracts/[id]/file-url
 *
 * Returns a short-lived signed URL (1 hour) for the contract's original file.
 * The contracts bucket is private (PDPA compliance), so the stored public URL
 * no longer works — this endpoint generates a valid signed URL on demand.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // RLS-enforced ownership check via session client
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, landlord_id, original_file_url')
    .eq('id', params.id)
    .single();

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }
  if (contract.landlord_id !== user.id) {
    return unauthorized();
  }

  const fileUrl = contract.original_file_url as string | null;
  if (!fileUrl) {
    return NextResponse.json({ error: 'No file attached' }, { status: 404 });
  }

  // Extract storage path from the stored public URL.
  // Format: https://<project>.supabase.co/storage/v1/object/public/contracts/<path>
  const storagePath = fileUrl.split('/storage/v1/object/public/contracts/')[1] ?? null;
  if (!storagePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const signedUrl = await getSignedDocumentUrl(storagePath, 'contracts', 3600);
  if (!signedUrl) {
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl });
}
