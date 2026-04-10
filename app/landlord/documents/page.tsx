import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/supabase/server-session';
import { redirect } from 'next/navigation';
import { DocumentsClient } from './DocumentsClient';

interface Document {
  id: string;
  landlord_id: string;
  property_id: string | null;
  contract_id: string | null;
  category: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  notes: string | null;
  created_at: string;
  properties?: { name: string } | null;
}

export default async function LandlordDocumentsPage() {
  const { user, profile } = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  const isPro =
    profile?.tier === 'pro' || process.env.NEXT_PUBLIC_DEFER_TIER_ENFORCEMENT === 'true';

  const [documentsRes, propertiesRes] = await Promise.all([
    supabase
      .from('documents')
      .select(
        'id, landlord_id, property_id, contract_id, category, public_url, file_name, file_size, mime_type, version, notes, created_at, properties(name)'
      )
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('properties').select('id, name').eq('landlord_id', user.id),
  ]);

  const documents = (documentsRes.data ?? []) as unknown as Document[];
  const properties = propertiesRes.data ?? [];

  return (
    <DocumentsClient initialDocuments={documents} initialProperties={properties} isPro={isPro} />
  );
}
