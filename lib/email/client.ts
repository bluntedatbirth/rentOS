import { Resend } from 'resend';

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    client = new Resend(key);
  }
  return client;
}

export const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS ?? 'RentOS <hello@rentos.homes>';
export const BUG_REPORT_TO = process.env.BUG_REPORT_TO ?? 'hello@rentos.homes';
