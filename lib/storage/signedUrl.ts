import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Generate a short-lived signed URL for a document stored in a private bucket.
 *
 * Use this instead of returning the stored public_url for any document with PII
 * (contracts, tenant ID scans, receipts, inspections). The contracts bucket is
 * private (PDPA compliance), so public URLs do not work — signed URLs are the
 * only valid access mechanism for end-user downloads.
 *
 * NOTE to AI/Backend agent: any API route that currently returns `public_url`
 * from the documents table (or any storage path from the contracts bucket)
 * should call this function and return the signed URL with a 1-hour TTL instead.
 *
 * @param storagePath    The storage object path (value of documents.storage_path)
 * @param bucket         The bucket name (default: 'contracts')
 * @param expiresInSeconds  Signed URL TTL in seconds (default: 3600 = 1 hour)
 * @returns Signed URL string, or null on error
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  bucket: string = 'contracts',
  expiresInSeconds: number = 3600
): Promise<string | null> {
  const client = createServiceRoleClient();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
