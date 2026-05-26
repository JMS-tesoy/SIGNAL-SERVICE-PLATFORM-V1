import { baseEmailTemplate, baseEmailText } from './base-template.js';

export interface WelcomeTemplateProps {
  userName?: string;
  dashboardUrl: string;
}

export function welcomeTemplate({ dashboardUrl }: WelcomeTemplateProps): string {
  return baseEmailTemplate({
    title: 'Welcome to Signal Service',
    preheader: 'Your Signal Service account is ready.',
    body: 'Your Signal Service account is ready.',
    cta: {
      label: 'Open dashboard',
      url: dashboardUrl,
    },
    fallbackLink: dashboardUrl,
    securityNotice: 'If you did not create this account, contact support and secure your email account.',
  });
}

export function welcomeText({ dashboardUrl }: WelcomeTemplateProps): string {
  return baseEmailText({
    title: 'Welcome to Signal Service',
    body: 'Your Signal Service account is ready.',
    cta: {
      label: 'Open dashboard',
      url: dashboardUrl,
    },
    fallbackLink: dashboardUrl,
    securityNotice: 'If you did not create this account, contact support and secure your email account.',
  });
}

