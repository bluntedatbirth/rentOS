import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { TenantDocumentsClient } from './TenantDocumentsClient';

interface Document {
  id: string;
  category: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  version: number;
  notes: string | null;
  created_at: string;
  properties?: { name: string } | null;
}

export default async function TenantDocumentsPage() {
  const { user } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // Fetch active contract id and documents in parallel
  const [contractResult, docsResult] = await Promise.all([
    supabase
      .from('contracts')
      .select('id')
      .eq('tenant_id', user.id)
      .eq('status', 'active')
      .limit(1),
    supabase
      .from('documents')
      .select(
        'id, category, public_url, file_name, file_size, version, notes, created_at, properties(name)'
      )
      .order('created_at', { ascending: false }),
  ]);

  const activeContractId = contractResult.data?.[0]?.id ?? null;
  const documents = (docsResult.data ?? []) as unknown as Document[];

  return <TenantDocumentsClient documents={documents} activeContractId={activeContractId} />;
}
