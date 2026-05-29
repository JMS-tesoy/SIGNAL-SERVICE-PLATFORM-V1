export type SetupStep = 'idle' | 'setup' | 'verify' | 'backup';

export type SecurityStatus = {
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  emailVerified: boolean;
  hasPhone: boolean;
};

export type TotpData = {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
};

export type PasswordFields = {
  current: string;
  new: string;
  confirm: string;
};

export type VisiblePasswordFields = {
  current: boolean;
  new: boolean;
  confirm: boolean;
};

export type PasswordMessage = {
  type: string;
  text: string;
};

export type PasswordCheck = {
  label: string;
  passed: boolean;
};

export type SecuritySession = {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  isCurrent?: boolean;
};
