'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { securityApi, userApi } from '@/lib/api';
import { AccountSecurityInfo } from './components/AccountSecurityInfo';
import { ActiveSessionsCard } from './components/ActiveSessionsCard';
import { BackupCodesPanel } from './components/BackupCodesPanel';
import { ChangePasswordCard } from './components/ChangePasswordCard';
import { DisableTwoFactorModal } from './components/DisableTwoFactorModal';
import { TotpSetupFlow } from './components/TotpSetupFlow';
import { TwoFactorCard } from './components/TwoFactorCard';
import {
  PasswordFields,
  PasswordMessage,
  SecuritySession,
  SecurityStatus,
  SetupStep,
  TotpData,
  VisiblePasswordFields,
} from './types';
import { getPasswordChecks } from './utils';

const initialPasswords: PasswordFields = {
  current: '',
  new: '',
  confirm: '',
};

const initialVisiblePasswordFields: VisiblePasswordFields = {
  current: false,
  new: false,
  confirm: false,
};

export default function SecurityPage() {
  const { accessToken } = useAuthStore();

  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [totpData, setTotpData] = useState<TotpData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [passwords, setPasswords] = useState<PasswordFields>(initialPasswords);
  const [visiblePasswordFields, setVisiblePasswordFields] = useState<VisiblePasswordFields>(
    initialVisiblePasswordFields
  );
  const [passwordMessage, setPasswordMessage] = useState<PasswordMessage>({
    type: '',
    text: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionActionId, setSessionActionId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const passwordChecks = useMemo(() => getPasswordChecks(passwords), [passwords]);
  const newPasswordIsStrong = passwordChecks.every((check) => check.passed);
  const newPasswordsMatch = Boolean(passwords.confirm) && passwords.new === passwords.confirm;

  useEffect(() => {
    fetchStatus();
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    const handlePopState = () => {
      setSetupStep('idle');
      setTotpData(null);
      setBackupCodes([]);
      setVerifyCode('');
      setError('');
      setCopiedKey(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const resetSetupFlow = () => {
    setSetupStep('idle');
    setTotpData(null);
    setBackupCodes([]);
    setVerifyCode('');
    setError('');
    setCopiedKey(null);

    if (window.location.pathname === '/dashboard/security') {
      window.history.replaceState(null, '', '/dashboard/security');
    }
  };

  const fetchStatus = async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [twoFactorResult, emailResult] = await Promise.all([
        securityApi.get2FAStatus(accessToken),
        securityApi.getEmailStatus(accessToken),
      ]);

      if (twoFactorResult.error && emailResult.error) {
        setError(twoFactorResult.error || emailResult.error || 'Failed to load security status');
      }

      if (twoFactorResult.data || emailResult.data) {
        setStatus({
          twoFactorEnabled: Boolean(twoFactorResult.data?.enabled),
          twoFactorMethod: twoFactorResult.data?.method || null,
          emailVerified: Boolean(emailResult.data?.verified),
          hasPhone: false,
        });
      }
    } catch {
      setError('Failed to load security status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupTOTP = async () => {
    if (!accessToken) return;

    setActionLoading(true);
    setError('');
    setCopiedKey(null);

    try {
      const result = await securityApi.setupTOTP(accessToken);

      if (result.data) {
        setTotpData(result.data);
        setSetupStep('setup');

        if (window.location.pathname === '/dashboard/security') {
          window.history.pushState(
            { securitySetup: 'totp' },
            '',
            '/dashboard/security?setup=authenticator'
          );
        }
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Failed to setup 2FA');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!accessToken || verifyCode.length !== 6) return;

    setActionLoading(true);
    setError('');

    try {
      const result = await securityApi.enableTOTP(accessToken, verifyCode);

      if (result.data?.backupCodes) {
        setBackupCodes(result.data.backupCodes);
        setSetupStep('backup');
        setCopiedKey(null);
        fetchStatus();
      } else if (result.error) {
        setError(result.error);
        setVerifyCode('');
      }
    } catch {
      setError('Failed to verify code');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!accessToken || !disablePassword) return;

    setActionLoading(true);
    setError('');

    try {
      const result = await securityApi.disable2FA(accessToken, disablePassword);

      if (result.error) {
        setError(result.error);
      } else {
        setShowDisable(false);
        setDisablePassword('');
        fetchStatus();
      }
    } catch {
      setError('Failed to disable 2FA');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!accessToken) {
      setSessionsLoading(false);
      return;
    }

    setSessionsLoading(true);

    try {
      const result = await securityApi.getSessions(accessToken);

      if (result.data?.sessions) {
        setSessions(result.data.sessions as SecuritySession[]);
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Failed to load active sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!accessToken) return;

    setSessionActionId(sessionId);
    setError('');

    try {
      const result = await securityApi.revokeSession(accessToken, sessionId);

      if (result.error) {
        setError(result.error);
      } else {
        await fetchSessions();
      }
    } catch {
      setError('Failed to revoke session');
    } finally {
      setSessionActionId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!accessToken) return;
    if (!confirm('This will sign out all other active sessions. Continue?')) return;

    setSessionActionId('all');
    setError('');

    try {
      const result = await securityApi.revokeAllSessions(accessToken);

      if (result.error) {
        setError(result.error);
      } else {
        await fetchSessions();
      }
    } catch {
      setError('Failed to revoke sessions');
    } finally {
      setSessionActionId(null);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!accessToken) return;

    setPasswordMessage({ type: '', text: '' });

    if (passwords.new !== passwords.confirm) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwords.current === passwords.new) {
      setPasswordMessage({
        type: 'error',
        text: 'New password must be different from your current password',
      });
      return;
    }

    if (!newPasswordIsStrong) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must include uppercase, lowercase, number, and symbol.',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await userApi.changePassword(accessToken, passwords.current, passwords.new);

      if (result.error) {
        setPasswordMessage({ type: 'error', text: result.error });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswords(initialPasswords);
        setVisiblePasswordFields(initialVisiblePasswordFields);
        await fetchSessions();
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: keyof VisiblePasswordFields) => {
    setVisiblePasswordFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const copyToClipboard = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
    } catch {
      setError('Could not copy value. Please copy it manually.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Security Settings</h1>
        <p className="text-foreground-muted">
          Protect your account with two-factor authentication
        </p>
      </div>

      {error && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl flex items-center gap-3 text-accent-red">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        <section className="lg:col-span-2">
          <TwoFactorCard
            status={status}
            setupStep={setupStep}
            actionLoading={actionLoading}
            onSetupTOTP={handleSetupTOTP}
            onShowDisable={() => setShowDisable(true)}
          />
        </section>

        <section className="lg:col-span-2">
          <AccountSecurityInfo status={status} />
        </section>

        {setupStep === 'setup' && totpData && (
          <section className="lg:col-span-4">
            <TotpSetupFlow
              totpData={totpData}
              verifyCode={verifyCode}
              actionLoading={actionLoading}
              copiedKey={copiedKey}
              onCopy={copyToClipboard}
              onVerifyCodeChange={setVerifyCode}
              onVerifyAndEnable={handleVerifyAndEnable}
              onCancel={resetSetupFlow}
            />
          </section>
        )}

        {setupStep === 'backup' && backupCodes.length > 0 && (
          <section className="lg:col-span-4">
            <BackupCodesPanel
              backupCodes={backupCodes}
              copiedKey={copiedKey}
              onCopy={copyToClipboard}
              onDone={resetSetupFlow}
            />
          </section>
        )}

        <section className="lg:col-span-2">
          <ChangePasswordCard
            passwords={passwords}
            visiblePasswordFields={visiblePasswordFields}
            passwordChecks={passwordChecks}
            newPasswordsMatch={newPasswordsMatch}
            passwordMessage={passwordMessage}
            isChangingPassword={isChangingPassword}
            onSubmit={handleChangePassword}
            onPasswordsChange={setPasswords}
            onToggleVisibility={togglePasswordVisibility}
          />
        </section>

        <section className="lg:col-span-2">
          <ActiveSessionsCard
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            sessionActionId={sessionActionId}
            onRevokeSession={handleRevokeSession}
            onRevokeAllSessions={handleRevokeAllSessions}
          />
        </section>
      </div>

      {showDisable && (
        <DisableTwoFactorModal
          disablePassword={disablePassword}
          actionLoading={actionLoading}
          onPasswordChange={setDisablePassword}
          onCancel={() => setShowDisable(false)}
          onConfirm={handleDisable2FA}
        />
      )}
    </div>
  );
}
