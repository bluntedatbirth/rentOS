import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/supabase/api';
import { getSignedDocumentUrl } from '@/lib/storage/signedUrl';

/**
 * GET /api/contracts/[id]/file-url
 *
 * Returns a short-lived signed URL (1 hour) for the contract's original file.
 * The contracts bucket is private (PDPA compliance), so the stored public URL
 * no longer works — this endpoint generates a valid signed URL on demand.
 *
 * Access: the landlord of the contract OR the tenant named on the contract.
 * Both roles need the URL for the in-app PDF viewer auto-refresh.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // RLS-enforced ownership check via session client.
  // Select tenant_id so we can allow the tenant to refresh as well.
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, landlord_id, tenant_id, original_file_url')
    .eq('id', params.id)
    .single();

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  // Allow the landlord OR the tenant on this contract.
  const isLandlord = contract.landlord_id === user.id;
  const isTenant = contract.tenant_id != null && (contract.tenant_id as string) === user.id;
  if (!isLandlord && !isTenant) {
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
