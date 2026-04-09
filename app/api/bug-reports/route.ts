import nodemailer from 'nodemailer';
import { getAuthenticatedUser } from '@/lib/supabase/api';

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `RentOS Bugs <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself
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
