import { getResendClient, FROM_ADDRESS } from './client';

export type EmailKind =
  | 'magic_link'
  | 'email_change'
  | 'welcome_oauth'
  | 'password_reset'
  | 'bug_report';

export interface SendEmailParams {
  to: string;
  kind: EmailKind;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      headers: { 'X-RentOS-Kind': params.kind },
    });
    if (error) {
      console.error('[email] resend error', params.kind, error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error('[email] threw', params.kind, e);
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}
