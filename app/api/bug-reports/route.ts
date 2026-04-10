import { getAuthenticatedUser } from '@/lib/supabase/api';
import { sendEmail } from '@/lib/email/send';
import { BUG_REPORT_TO } from '@/lib/email/client';
import { bugReportTemplate } from '@/lib/email/templates/bugReport';

export async function POST(request: Request) {
  const body = (await request.json()) as {
    description?: string;
    page?: string;
    userAgent?: string;
  };

  if (!body.description?.trim()) {
    return Response.json({ error: 'Description required' }, { status: 400 });
  }
  if (body.description.length > 5000) {
    return Response.json({ error: 'Description too long' }, { status: 400 });
  }

  let userEmail = 'Anonymous';
  try {
    const { user } = await getAuthenticatedUser();
    if (user?.email) userEmail = user.email;
  } catch {
    // Not logged in, that's fine
  }

  const { subject, html, text } = bugReportTemplate({
    description: body.description,
    page: body.page ?? 'Unknown',
    userEmail,
    userAgent: body.userAgent ?? 'Unknown',
    timestamp: new Date().toISOString(),
  });

  const result = await sendEmail({
    to: BUG_REPORT_TO,
    kind: 'bug_report',
    subject,
    html,
    text,
    replyTo: userEmail !== 'Anonymous' ? userEmail : undefined,
  });

  if (!result.ok) {
    console.error('[bug-reports] sendEmail failed:', result.error);
    return Response.json({ error: 'Failed to send report' }, { status: 500 });
  }

  return Response.json({ success: true });
}
