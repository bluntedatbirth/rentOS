import { NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized, badRequest, serverError } from '@/lib/supabase/api';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { generateContract, ContractWizardInput } from '@/lib/claude/generateContract';
import { requirePro } from '@/lib/tier';
import { sendNotification } from '@/lib/notifications/send';

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return unauthorized();

  // Rate limit: 3 generations per minute
  const { success } = rateLimit(`generate:${user.id}`, 3, 60000);
  if (!success) return rateLimitResponse();

  // Check pro tier
  const adminClient = createServiceRoleClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('tier, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'landlord') {
    return unauthorized();
  }

  const tierCheck = requirePro(profile.tier, 'Contract generation requires a Pro plan.');
  if (!tierCheck.allowed) {
    return NextResponse.json(tierCheck, { status: 403 });
  }

  try {
    const body = (await request.json()) as ContractWizardInput;

    // Basic validation
    if (!body.property_name || !body.landlord_name || !body.monthly_rent) {
      return badRequest('Missing required fields');
    }

    const result = await generateContract(body);

    // Send TM.30 reminder if foreign tenant
    if (body.tenant_nationality === 'foreign') {
      sendNotification({
        recipientId: user.id,
        type: 'custom',
        titleEn: 'TM.30 Filing Required',
        titleTh: 'ต้องยื่นแบบ ตม.30',
        bodyEn: `File TM.30 with Immigration within 24 hours of your foreign tenant moving into ${body.property_name}. File online at tm30.immigration.go.th or visit your local immigration office.`,
        bodyTh: `ยื่นแบบ ตม.30 ต่อสำนักงานตรวจคนเข้าเมืองภายใน 24 ชม. หลังผู้เช่าต่างชาติเข้าพักที่ ${body.property_name} ยื่นออนไลน์ที่ tm30.immigration.go.th หรือสำนักงานใกล้บ้าน`,
        url: '/landlord/documents/tm30',
      }).catch(() => {}); // Non-blocking
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Contract generation failed';
    return serverError(message);
  }
}
