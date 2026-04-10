import { wrapHtml, wrapText, button } from '../layout';

export interface MagicLinkTemplateParams {
  actionUrl: string;
  email: string;
  role?: 'landlord' | 'tenant';
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}

export function magicLinkTemplate(params: MagicLinkTemplateParams): RenderedTemplate {
  const subject = 'Finish creating your RentOS account';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2D2D2D;">
      Hi there,
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#2D2D2D;">
      Click the button below to sign in to your RentOS account. This link expires in <strong>1 hour</strong>.
    </p>
    <p style="margin:0 0 32px;">
      ${button('Sign in to RentOS', params.actionUrl)}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B6B6B;">
      If this wasn't you, you can safely ignore this email.
    </p>
  `;

  const bodyText = `Hi there,

Click the link below to sign in to your RentOS account. This link expires in 1 hour.

${params.actionUrl}

If this wasn't you, you can safely ignore this email.`;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml),
    text: wrapText(subject, bodyText),
  };
}
