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

  // RLS policy returns only documents the tenant has access to
  const { data } = await supabase
    .from('documents')
    .select(
      'id, category, public_url, file_name, file_size, version, notes, created_at, properties(name)'
    )
    .order('created_at', { ascending: false });

  const documents = (data ?? []) as unknown as Document[];

  return <TenantDocumentsClient documents={documents} />;
}
