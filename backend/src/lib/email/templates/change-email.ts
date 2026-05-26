import { baseEmailTemplate, baseEmailText } from './base-template.js';

export interface ChangeEmailTemplateProps {
  userName?: string;
  confirmationUrl: string;
}

export function changeEmailTemplate({ confirmationUrl }: ChangeEmailTemplateProps): string {
  return baseEmailTemplate({
    title: 'Confirm your new email address',
    preheader: 'Confirm your Signal Service email change.',
    body: 'Confirm this email address to complete the change.',
    cta: {
      label: 'Confirm email',
      url: confirmationUrl,
    },
    fallbackLink: confirmationUrl,
    securityNotice: 'If you did not request this change, secure your account immediately.',
  });
}

export function changeEmailText({ confirmationUrl }: ChangeEmailTemplateProps): string {
  return baseEmailText({
    title: 'Confirm your new email address',
    body: 'Confirm this email address to complete the change.',
    cta: {
      label: 'Confirm email',
      url: confirmationUrl,
    },
    fallbackLink: confirmationUrl,
    securityNotice: 'If you did not request this change, secure your account immediately.',
  });
}

