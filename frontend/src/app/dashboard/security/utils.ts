import { PasswordCheck, PasswordFields } from './types';

export function getPasswordChecks(passwords: PasswordFields): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', passed: passwords.new.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(passwords.new) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(passwords.new) },
    { label: 'One number', passed: /[0-9]/.test(passwords.new) },
    { label: 'One symbol', passed: /[^A-Za-z0-9]/.test(passwords.new) },
  ];
}

export function getSessionDeviceLabel(userAgent?: string | null) {
  return userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop';
}

export function formatSessionDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
}
