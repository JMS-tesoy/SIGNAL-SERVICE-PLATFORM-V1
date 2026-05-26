import { baseEmailTemplate, baseEmailText } from './base-template.js';

export interface OtpTemplateProps {
  userName?: string;
  code: string;
}

export function otpTemplate({ code }: OtpTemplateProps): string {
  return baseEmailTemplate({
    title: 'Your verification code',
    preheader: 'Use this code to continue.',
    body: 'Use this code to continue.',
    code,
    securityNotice: 'Do not share this code with anyone.',
  });
}

export function otpText({ code }: OtpTemplateProps): string {
  return baseEmailText({
    title: 'Your verification code',
    body: 'Use this code to continue.',
    code,
    securityNotice: 'Do not share this code with anyone.',
  });
}

