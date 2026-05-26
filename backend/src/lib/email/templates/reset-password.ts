import { baseEmailTemplate, baseEmailText } from './base-template.js';

export interface ResetPasswordTemplateProps {
  userName?: string;
  resetUrl: string;
}

export function resetPasswordTemplate({ resetUrl }: ResetPasswordTemplateProps): string {
  return baseEmailTemplate({
    title: 'Reset your password',
    preheader: 'Reset your Signal Service password.',
    body: 'Use the button below to reset your password.',
    cta: {
      label: 'Reset password',
      url: resetUrl,
    },
    fallbackLink: resetUrl,
    securityNotice: 'If you did not request this, you can safely ignore this email.',
  });
}

export function resetPasswordText({ resetUrl }: ResetPasswordTemplateProps): string {
  return baseEmailText({
    title: 'Reset your password',
    body: 'Use the button below to reset your password.',
    cta: {
      label: 'Reset password',
      url: resetUrl,
    },
    fallbackLink: resetUrl,
    securityNotice: 'If you did not request this, you can safely ignore this email.',
  });
}

