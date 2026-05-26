import { baseEmailTemplate, baseEmailText } from './base-template.js';

export interface SecurityAlertTemplateProps {
  userName?: string;
  eventName?: string;
  time?: string;
  device?: string;
  ipAddress?: string;
  location?: string;
}

function detailsList(props: SecurityAlertTemplateProps): string {
  const details = [
    props.eventName ? `Event: ${props.eventName}` : null,
    props.time ? `Time: ${props.time}` : null,
    props.device ? `Device: ${props.device}` : null,
    props.ipAddress ? `IP address: ${props.ipAddress}` : null,
    props.location ? `Location: ${props.location}` : null,
  ].filter(Boolean);

  return details.length ? ` Details: ${details.join(' | ')}.` : '';
}

export function securityAlertTemplate(props: SecurityAlertTemplateProps): string {
  return baseEmailTemplate({
    title: 'Security alert for your Signal Service account',
    preheader: 'A security event was recorded on your account.',
    body: `A security event was recorded on your Signal Service account.${detailsList(props)}`,
    securityNotice: 'If this was not you, change your password immediately.',
  });
}

export function securityAlertText(props: SecurityAlertTemplateProps): string {
  return baseEmailText({
    title: 'Security alert for your Signal Service account',
    body: `A security event was recorded on your Signal Service account.${detailsList(props)}`,
    securityNotice: 'If this was not you, change your password immediately.',
  });
}

