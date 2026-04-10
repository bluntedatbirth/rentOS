import { wrapHtml, wrapText, button } from '../layout';
import { RenderedTemplate } from './magicLink';

export interface WelcomeOauthTemplateParams {
  fullName: string | null;
  role: 'landlord' | 'tenant';
  dashboardUrl: string;
}

const LANDLORD_BULLETS = [
  'Add your first property',
  'Upload a contract',
  'Invite your tenant via QR code',
];

const TENANT_BULLETS = [
  'View your contract',
  'Pay attention to upcoming rent reminders',
  'Send a maintenance request',
];

export function welcomeOauthTemplate(params: WelcomeOauthTemplateParams): RenderedTemplate {
  const subject = 'Welcome to RentOS';
  const greeting = params.fullName ? `Hi ${params.fullName},` : 'Hi there,';
  const bullets = params.role === 'landlord' ? LANDLORD_BULLETS : TENANT_BULLETS;

  const bulletsHtml = bullets
    .map(
      (b) => `<li style="margin-bottom:8px;font-size:15px;line-height:1.6;color:#2D2D2D;">${b}</li>`
    )
    .join('\n');

  const bulletsText = bullets.map((b) => `  • ${b}`).join('\n');

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2D2D2D;">
      ${greeting}
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#2D2D2D;">
      You're now part of RentOS — Thailand's rental management platform built for people, not spreadsheets.
    </p>
    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#2D2D2D;">Getting started</p>
    <ul style="margin:0 0 28px;padding-left:20px;">
      ${bulletsHtml}
    </ul>
    <p style="margin:0 0 32px;">
      ${button('Go to your dashboard', params.dashboardUrl)}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B6B6B;">
      If you have any questions, reply to this email — we're happy to help.
    </p>
  `;

  const bodyText = `${greeting}

You're now part of RentOS — Thailand's rental management platform built for people, not spreadsheets.

Getting started:
${bulletsText}

Go to your dashboard:
${params.dashboardUrl}

If you have any questions, reply to this email — we're happy to help.`;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml),
    text: wrapText(subject, bodyText),
  };
}
