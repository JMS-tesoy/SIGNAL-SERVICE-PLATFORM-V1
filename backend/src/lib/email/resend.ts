import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

