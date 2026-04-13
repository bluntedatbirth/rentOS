import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requirePro } from '@/lib/tier';
import { getSignedDocumentUrl } from '@/lib/storage/signedUrl';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const VALID_CATEGORIES = ['contract', 'tenant_id', 'inspection', 'receipt', 'other'] as const;
type DocumentCategory = (typeof VALID_CATEGORIES)[number];

const TENANT_UPLOAD_CATEGORIES: DocumentCategory[] = ['tenant_id', 'receipt', 'other'];

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}

// GET /api/documents
// List documents with optional filters: property_id, contract_id, category
// ?versions=true&document_name=X&document_category=Y shows all versions of a specific doc
export async function GET(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('property_id');
  const contractId = searchParams.get('contract_id');
  const category = searchParams.get('category');
  const showVersions = searchParams.get('versions') === 'true';
  const versionFileName = searchParams.get('version_file_name');
  const versionCategory = searchParams.get('version_category');
  const versionPropertyId = searchParams.get('version_property_id');

  // Get user tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier ?? 'free';

  let query = supabase
    .from('documents')
    .select('*, properties(name)')
    .order('created_at', { ascending: false });

  // Free tier: only contract category
  if (userTier !== 'pro') {
    query = query.eq('category', 'contract');
  } else if (category) {
    query = query.eq('category', category as DocumentCategory);
  }

  if (propertyId) query = query.eq('property_id', propertyId);
  if (contractId) query = query.eq('contract_id', contractId);

  // Show all versions of a specific document
  if (showVersions && versionFileName && versionCategory) {
    query = supabase
      .from('documents')
      .select('*, properties(name)')
      .eq('file_name', versionFileName)
      .eq('category', versionCategory as DocumentCategory)
      .order('version', { ascending: false });

    if (versionPropertyId) query = query.eq('property_id', versionPropertyId);
  } else if (!showVersions) {
    // Default: latest version only — use a subquery approach by fetching all then deduping
    // Supabase doesn't support DISTINCT ON easily, so we fetch and deduplicate in JS
  }

  const { data, error } = await query;

  if (error) return serverError(error.message);

  // If not showing all versions, deduplicate to latest version per (file_name, category, property_id)
  let rows = data ?? [];
  if (!showVersions && data) {
    const seen = new Map<string, (typeof data)[0]>();
    for (const doc of data) {
      const key = `${doc.file_name}:${doc.category}:${doc.property_id ?? ''}`;
      const existing = seen.get(key);
      if (!existing || doc.version > existing.version) {
        seen.set(key, doc);
      }
    }
    rows = Array.from(seen.values());
  }

  // Replace stored public_url with a fresh signed URL (PDPA: documents bucket is private)
  const withSignedUrls = await Promise.all(
    rows.map(async (doc) => ({
      ...doc,
      public_url: doc.storage_path
        ? await getSignedDocumentUrl(doc.storage_path, 'documents', 3600)
        : null,
    }))
  );

  return NextResponse.json(withSignedUrls);
}

// POST /api/documents
// Upload a document (FormData)
export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Get user tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier ?? 'free';

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('Invalid form data');
  }

  const file = formData.get('file') as File | null;
  const category = formData.get('category') as string | null;
  const propertyId = formData.get('property_id') as string | null;
  const contractId = formData.get('contract_id') as string | null;
  const notes = formData.get('notes') as string | null;

  if (!file) return badRequest('No file provided');

  if (!category || !VALID_CATEGORIES.includes(category as DocumentCategory)) {
    return badRequest(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return badRequest('Unsupported file type. Only JPEG, PNG, WebP, and PDF are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    return badRequest('File too large. Maximum size is 25MB.');
  }

  const adminClient = createServiceRoleClient();

  // Resolve contract row when contract_id is provided — needed for both
  // tenant-upload branch (to get landlord_id) and general validation.
  let contractRow: {
    id: string;
    tenant_id: string | null;
    landlord_id: string | null;
    status: string;
    property_id: string | null;
  } | null = null;
  if (contractId) {
    const { data: cr } = await adminClient
      .from('contracts')
      .select('id, tenant_id, landlord_id, status, property_id')
      .eq('id', contractId)
      .single();
    contractRow = cr ?? null;
  }

  // --- Tenant upload branch ---
  if (contractRow && contractRow.tenant_id === user.id) {
    // Tenant must have an active contract
    if (contractRow.status !== 'active') {
      return NextResponse.json({ error: 'No active contract' }, { status: 403 });
    }

    // Tenant-owned contracts (no paired landlord) cannot upload documents yet —
    // the documents table requires a landlord_id FK.
    if (!contractRow.landlord_id) {
      return NextResponse.json(
        { error: 'Document upload is not available until your contract is paired with a landlord' },
        { status: 403 }
      );
    }

    // Tenants may only upload tenant_id, receipt, or other
    if (!TENANT_UPLOAD_CATEGORIES.includes(category as DocumentCategory)) {
      return NextResponse.json(
        { error: 'Tenants may not upload category: ' + category },
        { status: 403 }
      );
    }

    try {
      const _ext = extFromMime(file.type);
      const _docId = crypto.randomUUID();
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `tenant-uploads/${user.id}/${contractId}/${timestamp}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await adminClient.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return serverError('Storage upload failed: ' + uploadError.message);
      }

      // landlord_id resolved from the contract row (NOT NULL requirement).
      // We already checked landlord_id is non-null above, so this cast is safe.
      const { data: doc, error: insertError } = await adminClient
        .from('documents')
        .insert({
          landlord_id: contractRow.landlord_id as string,
          uploaded_by: user.id,
          property_id: contractRow.property_id ?? null,
          contract_id: contractId,
          category: category as DocumentCategory,
          storage_path: storagePath,
          public_url: null,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          version: 1,
          notes: notes ?? null,
        })
        .select()
        .single();

      if (insertError || !doc) {
        await adminClient.storage.from('documents').remove([storagePath]);
        return serverError(
          'Failed to save document record: ' + (insertError?.message ?? 'unknown')
        );
      }

      const signedUrl = await getSignedDocumentUrl(storagePath, 'documents', 3600);
      return NextResponse.json({ ...doc, public_url: signedUrl }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return serverError(message);
    }
  }

  // --- Landlord upload branch ---
  // Verify caller is the landlord (or no contract_id was given, fallback to existing logic)
  if (contractRow && contractRow.landlord_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Gate non-contract categories behind Pro
  if (category !== 'contract') {
    const check = requirePro(userTier, `Document category: ${category}`);
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'Pro required', upgradeUrl: check.upgradeUrl },
        { status: 403 }
      );
    }
  }

  // Determine next version number
  let version = 1;
  if (propertyId) {
    const { data: existing } = await adminClient
      .from('documents')
      .select('version')
      .eq('file_name', file.name)
      .eq('category', category as DocumentCategory)
      .eq('property_id', propertyId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      version = (existing.version ?? 0) + 1;
    }
  }

  try {
    const ext = extFromMime(file.type);
    const docId = crypto.randomUUID();
    const storagePath = `${user.id}/${category}/${docId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return serverError('Storage upload failed: ' + uploadError.message);
    }

    // PDPA: documents bucket is private — never store a public URL.
    // Signed URLs must be generated on read via getSignedDocumentUrl().
    const { data: doc, error: insertError } = await adminClient
      .from('documents')
      .insert({
        landlord_id: user.id,
        property_id: propertyId ?? null,
        contract_id: contractId ?? null,
        category: category as DocumentCategory,
        storage_path: storagePath,
        public_url: null,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        version,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (insertError || !doc) {
      await adminClient.storage.from('documents').remove([storagePath]);
      return serverError('Failed to save document record: ' + (insertError?.message ?? 'unknown'));
    }

    // Return a fresh signed URL for immediate client use
    const signedUrl = await getSignedDocumentUrl(storagePath, 'documents', 3600);
    return NextResponse.json({ ...doc, public_url: signedUrl }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return serverError(message);
  }
}
