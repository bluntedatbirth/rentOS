-- Team UU — TS-05: allow tenant-uploaded documents into the shared vault
--
-- The initial document vault migration (20260408100006_document_vault.sql)
-- restricted INSERTs to the contract's landlord. Tenants need to upload
-- their own receipts, IDs, and supporting docs. This migration adds an
-- uploaded_by column (back-compat: default to landlord_id) and a new
-- INSERT policy that lets tenants create rows where uploaded_by = their
-- uid AND they own the target contract as an active tenant. landlord_id
-- stays NOT NULL and is resolved server-side from the contract row.
--
-- Idempotent: safe to run multiple times.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Back-fill existing rows: treat landlord as the uploader
UPDATE public.documents SET uploaded_by = landlord_id WHERE uploaded_by IS NULL;

CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx ON public.documents(uploaded_by);

-- New INSERT policy for tenants: allow insert when the caller is the
-- tenant of an active contract and they are marking themselves as the
-- uploader. landlord_id is set by the server from the contract row.
DROP POLICY IF EXISTS tenant_insert ON public.documents;
CREATE POLICY tenant_insert ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = documents.contract_id
        AND c.tenant_id = auth.uid()
        AND c.status = 'active'
    )
  );

-- Tenants can SELECT their own uploads too (already covered by tenant_select
-- for contract-level visibility, but make the self-uploaded case explicit)
DROP POLICY IF EXISTS tenant_select_own_uploads ON public.documents;
CREATE POLICY tenant_select_own_uploads ON public.documents FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

NOTIFY pgrst, 'reload schema';
