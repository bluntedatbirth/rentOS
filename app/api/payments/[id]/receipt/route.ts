import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorized,
  badRequest,
  notFound,
  forbidden,
  serverError,
} from '@/lib/supabase/api';
import { generatePaymentReceipt } from '@/lib/pdf/generatePaymentReceipt';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Fetch payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select(
      'id, amount, due_date, paid_date, payment_type, status, promptpay_ref, notes, contract_id'
    )
    .eq('id', params.id)
    .single();

  if (paymentError || !payment) {
    return notFound('Payment not found');
  }

  // Enforce: must be paid with a paid_date
  if (payment.status !== 'paid' || !payment.paid_date) {
    return badRequest('Receipt only available for paid payments');
  }

  // Fetch contract with property + tenant + landlord ids
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, lease_start, lease_end, tenant_id, landlord_id, property_id')
    .eq('id', payment.contract_id)
    .single();

  if (contractError || !contract) {
    return notFound('Contract not found');
  }

  const tenantId = contract.tenant_id as string | null;
  const landlordId = contract.landlord_id as string | null;

  // Authorize: caller must be tenant or landlord on this contract
  if (tenantId !== user.id && landlordId !== user.id) {
    return forbidden();
  }

  // Fetch property details
  const propertyData = contract.property_id
    ? await supabase
        .from('properties')
        .select('name, address')
        .eq('id', contract.property_id)
        .single()
    : { data: null, error: null };

  // Fetch tenant and landlord profiles
  const profileIds = [tenantId, landlordId].filter((id): id is string => id !== null);
  const [tenantResult, landlordResult] = await Promise.all([
    tenantId
      ? supabase.from('profiles').select('id, full_name').eq('id', tenantId).single()
      : Promise.resolve({ data: null, error: null }),
    landlordId
      ? supabase.from('profiles').select('id, full_name').eq('id', landlordId).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Suppress unused variable warning
  void profileIds;

  if (!tenantResult.data || !landlordResult.data) {
    return serverError('Could not load party profiles');
  }

  const property = propertyData.data;
  const leaseStart = (contract.lease_start as string | null) ?? '';
  const leaseEnd = (contract.lease_end as string | null) ?? '';

  try {
    const pdfBytes = await generatePaymentReceipt(
      {
        id: payment.id,
        amount: payment.amount as number,
        due_date: payment.due_date as string,
        paid_date: payment.paid_date,
        payment_type: payment.payment_type as string,
        status: payment.status as string,
        promptpay_ref: (payment.promptpay_ref as string | null) ?? null,
        notes: (payment.notes as string | null) ?? null,
      },
      {
        id: contract.id,
        lease_start: leaseStart,
        lease_end: leaseEnd,
        property_name: (property as { name?: string } | null)?.name ?? null,
        property_address: (property as { address?: string } | null)?.address ?? null,
      },
      {
        id: tenantResult.data.id as string,
        full_name: (tenantResult.data.full_name as string | null) ?? null,
      },
      {
        id: landlordResult.data.id as string,
        full_name: (landlordResult.data.full_name as string | null) ?? null,
      }
    );

    const filename = `receipt-${payment.id.slice(0, 8)}.pdf`;
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return serverError(message);
  }
}
