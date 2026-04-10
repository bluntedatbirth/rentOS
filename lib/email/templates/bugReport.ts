import { wrapHtml, wrapText } from '../layout';
import { RenderedTemplate } from './magicLink';

export interface BugReportTemplateParams {
  description: string;
  page: string;
  userEmail: string;
  userAgent: string;
  timestamp: string;
}

export function bugReportTemplate(params: BugReportTemplateParams): RenderedTemplate {
  const subject = `[RentOS Bug] ${params.description.slice(0, 60)}`;

  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#2D2D2D;">Bug Report Details</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#6B6B6B;width:120px;vertical-align:top;">Page</td>
        <td style="padding:8px 0;font-size:14px;color:#2D2D2D;vertical-align:top;">${params.page}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Reporter</td>
        <td style="padding:8px 0;font-size:14px;color:#2D2D2D;vertical-align:top;">${params.userEmail}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">Time</td>
        <td style="padding:8px 0;font-size:14px;color:#2D2D2D;vertical-align:top;">${params.timestamp}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;">User Agent</td>
        <td style="padding:8px 0;font-size:13px;color:#6B6B6B;vertical-align:top;word-break:break-all;">${params.userAgent}</td>
      </tr>
    </table>
    <p style="margin:20px 0 8px;font-size:13px;color:#6B6B6B;">Description</p>
    <pre style="margin:0;padding:16px;background-color:#FAFAF7;border-radius:8px;font-size:13px;line-height:1.6;color:#2D2D2D;white-space:pre-wrap;word-break:break-word;font-family:monospace;">${escapeHtml(params.description)}</pre>
  `;

  const bodyText = `Bug Report Details
------------------
Page:       ${params.page}
Reporter:   ${params.userEmail}
Time:       ${params.timestamp}
User Agent: ${params.userAgent}

Description:
${params.description}`;

  return {
    subject,
    html: wrapHtml('Bug Report', bodyHtml),
    text: wrapText('Bug Report', bodyText),
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
