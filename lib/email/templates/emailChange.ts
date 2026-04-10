import { wrapHtml, wrapText, button } from '../layout';
import { RenderedTemplate } from './magicLink';

export interface EmailChangeTemplateParams {
  actionUrl: string;
  oldEmail: string;
  newEmail: string;
}

export function emailChangeTemplate(params: EmailChangeTemplateParams): RenderedTemplate {
  const subject = 'Confirm your new RentOS email';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2D2D2D;">
      Hi there,
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2D2D2D;">
      We received a request to change the email address on your RentOS account.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#FAFAF7;border-radius:8px;padding:16px 20px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#6B6B6B;padding-bottom:6px;">Current email</td>
        <td style="font-size:14px;color:#2D2D2D;font-weight:600;">${params.oldEmail}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#6B6B6B;padding-top:6px;">New email</td>
        <td style="font-size:14px;color:#2D2D2D;font-weight:600;padding-top:6px;">${params.newEmail}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2D2D2D;">
      Click the button below to confirm. This link expires in <strong>1 hour</strong>.
    </p>
    <p style="margin:0 0 32px;">
      ${button('Confirm new email', params.actionUrl)}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6B6B6B;">
      If you didn't request this change, please ignore this email. Your current email address will remain unchanged.
    </p>
  `;

  const bodyText = `Hi there,

We received a request to change the email address on your RentOS account.

Current email: ${params.oldEmail}
New email: ${params.newEmail}

Click the link below to confirm your new email address. This link expires in 1 hour.

${params.actionUrl}

If you didn't request this change, please ignore this email. Your current email address will remain unchanged.`;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml),
    text: wrapText(subject, bodyText),
  };
}
