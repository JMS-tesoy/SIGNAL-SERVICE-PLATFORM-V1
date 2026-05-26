import { getResendClient } from './resend.js';
import { emailSenders } from './senders.js';

export interface SendEmailInput {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
}

export interface SendEmailResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: input.from || emailSenders.app,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || htmlToText(input.html),
      replyTo: input.replyTo,
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

