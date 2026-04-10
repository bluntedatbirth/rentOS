-- H9 follow-up: make documents.public_url nullable
--
-- The 'documents' bucket is now private (see 20260409_p0sec_storage_private_contracts.sql),
-- so storing a public URL is semantically wrong — public URLs return 404 against a private
-- bucket, and signed URLs expire after 1 hour so they must be generated on read.
--
-- Any route that returns a document to a client should call getSignedDocumentUrl() from
-- lib/storage/signedUrl.ts instead of reading documents.public_url directly.

ALTER TABLE documents
  ALTER COLUMN public_url DROP NOT NULL;

COMMENT ON COLUMN documents.public_url IS
  'Legacy column. Nullable since the documents bucket is private. Do NOT read this directly — call getSignedDocumentUrl(storage_path, ''documents'') to generate a short-lived signed URL.';
