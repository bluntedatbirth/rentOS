import { wrapHtml, wrapText, button } from '../layout';
import { RenderedTemplate } from './magicLink';

export interface PasswordResetTemplateParams {
  actionUrl: string;
  email: string;
}

export function passwordResetTemplate(params: PasswordResetTemplateParams): RenderedTemplate {
  const subject = 'Reset your RentOS password';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2D2D2D;">
      Hi there,
    </p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#2D2D2D;">
      We received a request to reset the password for your RentOS account (<strong>${params.email}</strong>).
      Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
    </p>
    <p style="margin:0 0 32px;">
      ${button('Reset password', params.actionUrl)}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B6B6B;">
      If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
    </p>
  `;

  const bodyText = `Hi there,

We received a request to reset the password for your RentOS account (${params.email}).

Click the link below to choose a new password. This link expires in 1 hour.

${params.actionUrl}

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.`;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml),
    text: wrapText(subject, bodyText),
  };
}
