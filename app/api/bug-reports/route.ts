import { Resend } from 'resend';
import { getAuthenticatedUser } from '@/lib/supabase/api';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

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

  // Get user info if logged in (optional)
  let userEmail = 'Anonymous';
  try {
    const { user } = await getAuthenticatedUser();
    if (user?.email) userEmail = user.email;
  } catch {
    // Not logged in, that's fine
  }

  try {
    await getResend().emails.send({
      from: 'RentOS Bugs <bugs@rentos.app>',
      to: 'john.caules@gmail.com',
      subject: `[RentOS Bug] ${body.description.slice(0, 60)}`,
      text: [
        `Bug Report`,
        `----------`,
        `Description: ${body.description}`,
        `Page: ${body.page || 'Unknown'}`,
        `User: ${userEmail}`,
        `Time: ${new Date().toISOString()}`,
        `User Agent: ${body.userAgent || 'Unknown'}`,
      ].join('\n'),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('Failed to send bug report email:', err);
    return Response.json({ error: 'Failed to send report' }, { status: 500 });
  }
}
