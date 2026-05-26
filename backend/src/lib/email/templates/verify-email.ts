import { baseEmailTemplate, baseEmailText } from './base-template.js';

export interface VerifyEmailTemplateProps {
  userName?: string;
  verificationUrl: string;
}

export function verifyEmailTemplate({ verificationUrl }: VerifyEmailTemplateProps): string {
  return baseEmailTemplate({
    title: 'Verify your email',
    preheader: 'Finish setting up your Signal Service account.',
    body: 'Verify your email address to finish setting up your Signal Service account.',
    cta: {
      label: 'Verify email',
      url: verificationUrl,
    },
    fallbackLink: verificationUrl,
    securityNotice: 'If you did not create this account, you can safely ignore this email.',
  });
}

export function verifyEmailText({ verificationUrl }: VerifyEmailTemplateProps): string {
  return baseEmailText({
    title: 'Verify your email',
    body: 'Verify your email address to finish setting up your Signal Service account.',
    cta: {
      label: 'Verify email',
      url: verificationUrl,
    },
    fallbackLink: verificationUrl,
    securityNotice: 'If you did not create this account, you can safely ignore this email.',
  });
}

