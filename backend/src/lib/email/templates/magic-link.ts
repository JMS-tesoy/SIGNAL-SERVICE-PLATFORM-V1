import { baseEmailTemplate, baseEmailText } from './base-template.js';

export interface MagicLinkTemplateProps {
  userName?: string;
  magicLinkUrl: string;
}

export function magicLinkTemplate({ magicLinkUrl }: MagicLinkTemplateProps): string {
  return baseEmailTemplate({
    title: 'Sign in to your account',
    preheader: 'Continue signing in to Signal Service.',
    body: 'Use this secure link to continue signing in to Signal Service.',
    cta: {
      label: 'Sign in',
      url: magicLinkUrl,
    },
    fallbackLink: magicLinkUrl,
    securityNotice: 'If you did not request this sign-in link, you can safely ignore this email.',
  });
}

export function magicLinkText({ magicLinkUrl }: MagicLinkTemplateProps): string {
  return baseEmailText({
    title: 'Sign in to your account',
    body: 'Use this secure link to continue signing in to Signal Service.',
    cta: {
      label: 'Sign in',
      url: magicLinkUrl,
    },
    fallbackLink: magicLinkUrl,
    securityNotice: 'If you did not request this sign-in link, you can safely ignore this email.',
  });
}

