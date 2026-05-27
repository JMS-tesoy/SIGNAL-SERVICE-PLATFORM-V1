'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Smartphone,
  Mail,
  Key,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  Monitor,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { securityApi, userApi } from '@/lib/api';

export default function SecurityPage() {
  const { accessToken } = useAuthStore();
  const [status, setStatus] = useState<{
    twoFactorEnabled: boolean;
    twoFactorMethod: string | null;
    emailVerified: boolean;
    hasPhone: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<'idle' | 'setup' | 'verify' | 'backup'>('idle');
  const [totpData, setTotpData] = useState<{
    secret: string;
    qrCode: string;
    manualEntryKey: string;
  } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [visiblePasswordFields, setVisiblePasswordFields] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionActionId, setSessionActionId] = useState<string | null>(null);

  const passwordChecks = [
    { label: 'At least 8 characters', passed: passwords.new.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(passwords.new) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(passwords.new) },
    { label: 'One number', passed: /[0-9]/.test(passwords.new) },
    { label: 'One symbol', passed: /[^A-Za-z0-9]/.test(passwords.new) },
  ];
  const newPasswordIsStrong = passwordChecks.every((check) => check.passed);
  const newPasswordsMatch = Boolean(passwords.confirm) && passwords.new === passwords.confirm;

  useEffect(() => {
    fetchStatus();
    fetchSessions();
  }, [accessToken]);

  useEffect(() => {
    const handlePopState = () => {
      setSetupStep('idle');
      setTotpData(null);
      setBackupCodes([]);
      setVerifyCode('');
      setError('');
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

    if (window.location.pathname === '/dashboard/security') {
      window.history.replaceState(null, '', '/dashboard/security');
    }
  };

  const fetchStatus = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const [twoFactorResult, emailResult] = await Promise.all([
        securityApi.get2FAStatus(accessToken),
        securityApi.getEmailStatus(accessToken),
      ]);

      if (twoFactorResult.data || emailResult.data) {
        setStatus({
          twoFactorEnabled: Boolean(twoFactorResult.data?.enabled),
          twoFactorMethod: twoFactorResult.data?.method || null,
          emailVerified: Boolean(emailResult.data?.verified),
          hasPhone: false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupTOTP = async () => {
    if (!accessToken) return;
    setActionLoading(true);
    setError('');

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
    } catch (err) {
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
        fetchStatus();
      } else if (result.error) {
        setError(result.error);
        setVerifyCode('');
      }
    } catch (err) {
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
    } catch (err) {
      setError('Failed to disable 2FA');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!accessToken) return;
    setSessionsLoading(true);

    try {
      const result = await securityApi.getSessions(accessToken);
      if (result.data?.sessions) {
        setSessions(result.data.sessions);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      setError('Failed to revoke sessions');
    } finally {
      setSessionActionId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setPasswords({ current: '', new: '', confirm: '' });
        setVisiblePasswordFields({ current: false, new: false, confirm: false });
        await fetchSessions();
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof visiblePasswordFields) => {
    setVisiblePasswordFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
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

      {/* 2FA Status Card */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              status?.twoFactorEnabled ? 'bg-accent-green/10' : 'bg-accent-yellow/10'
            }`}>
              <Shield className={`w-7 h-7 ${
                status?.twoFactorEnabled ? 'text-accent-green' : 'text-accent-yellow'
              }`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
              <p className="text-foreground-muted">
                {status?.twoFactorEnabled
                  ? `Enabled via ${status.twoFactorMethod || 'authenticator app'}`
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status?.twoFactorEnabled
              ? 'bg-accent-green/10 text-accent-green'
              : 'bg-accent-yellow/10 text-accent-yellow'
          }`}>
            {status?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {!status?.twoFactorEnabled && setupStep === 'idle' && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-medium mb-4">Choose Authentication Method</h3>
            <div className="grid gap-4">
              <button
                onClick={handleSetupTOTP}
                disabled={actionLoading}
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-background-elevated transition text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-foreground-muted">
                    Use Google Authenticator, Authy, or similar apps
                  </p>
                </div>
                {actionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              </button>
            </div>
          </div>
        )}

        {status?.twoFactorEnabled && (
          <div className="mt-6 pt-6 border-t border-border">
            <button
              onClick={() => setShowDisable(true)}
              className="text-accent-red hover:underline text-sm"
            >
              Disable Two-Factor Authentication
            </button>
          </div>
        )}
      </div>

      {/* TOTP Setup Flow */}
      {setupStep === 'setup' && totpData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h3 className="text-lg font-semibold mb-4">Step 1: Scan QR Code</h3>
          <p className="text-foreground-muted mb-6">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-4 rounded-xl">
              <img src={totpData.qrCode} alt="QR Code" className="w-48 h-48" />
            </div>

            <div className="w-full">
              <p className="text-sm text-foreground-muted mb-2">
                Can't scan? Enter this key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-background-elevated rounded-lg font-mono text-sm break-all">
                  {totpData.manualEntryKey}
                </code>
                <button
                  onClick={() => copyToClipboard(totpData.manualEntryKey)}
                  className="p-3 hover:bg-background-elevated rounded-lg"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Step 2: Enter Verification Code</h3>
            <p className="text-foreground-muted mb-4">
              Enter the 6-digit code from your authenticator app
            </p>

            <div className="flex gap-4">
              <input
                id="two-factor-verification-code"
                name="verificationCode"
                aria-label="Two-factor verification code"
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input flex-1 text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              <button
                onClick={handleVerifyAndEnable}
                disabled={verifyCode.length !== 6 || actionLoading}
                className="btn-primary px-8"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Enable'}
              </button>
            </div>
          </div>

          <button
            onClick={resetSetupFlow}
            className="mt-4 text-foreground-muted hover:text-foreground text-sm"
          >
            ← Cancel setup
          </button>
        </motion.div>
      )}

      {/* Backup Codes */}
      {setupStep === 'backup' && backupCodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-accent-green/50"
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-accent-green" />
            <h3 className="text-lg font-semibold">2FA Enabled Successfully!</h3>
          </div>

          <p className="text-foreground-muted mb-6">
            Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
          </p>

          <div className="grid grid-cols-2 gap-3 p-4 bg-background-elevated rounded-xl">
            {backupCodes.map((code, i) => (
              <code key={i} className="font-mono text-sm">
                {code}
              </code>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
              className="btn-secondary flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy All
            </button>
            <button
              onClick={resetSetupFlow}
              className="btn-primary"
            >
              Done
            </button>
          </div>
        </motion.div>
      )}

      {/* Disable 2FA Modal */}
      {showDisable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDisable(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-background-secondary rounded-xl p-6 w-full max-w-md border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Disable Two-Factor Authentication</h3>
            <p className="text-foreground-muted mb-6">
              Enter your password to confirm disabling 2FA. This will make your account less secure.
            </p>

            <input
              id="disable-two-factor-password"
              name="disablePassword"
              aria-label="Password to disable two-factor authentication"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="input mb-4"
              placeholder="Enter your password"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisable(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={!disablePassword || actionLoading}
                className="flex-1 bg-accent-red hover:bg-accent-red/80 text-white py-2 px-4 rounded-lg font-semibold transition"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Disable 2FA'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Account Security Info */}
      <div className="card">
        <h3 className="font-semibold mb-4">Account Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-foreground-muted" />
              <span>Email Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-sm ${
                status?.emailVerified
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'bg-accent-yellow/10 text-accent-yellow'
              }`}>
                {status?.emailVerified ? 'Verified' : 'Not Verified'}
              </span>
              {!status?.emailVerified && (
                <a href="/verify-email" className="text-primary text-sm hover:underline">
                  Verify Now
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-foreground-muted" />
              <span>Password</span>
            </div>
            <span className="text-sm text-foreground-muted">Managed below</span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Key className="w-5 h-5 flex-shrink-0" />
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium mb-2">Current Password</label>
            <div className="relative">
              <input
                id="current-password"
                name="currentPassword"
                aria-label="Current password"
                type={visiblePasswordFields.current ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                className="input pr-12 text-sm"
                placeholder="Enter current password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-subtle transition hover:bg-background-elevated hover:text-foreground"
                aria-label={visiblePasswordFields.current ? 'Hide current password' : 'Show current password'}
              >
                {visiblePasswordFields.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium mb-2">New Password</label>
            <div className="relative">
              <input
                id="new-password"
                name="newPassword"
                aria-label="New password"
                type={visiblePasswordFields.new ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="input pr-12 text-sm"
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-subtle transition hover:bg-background-elevated hover:text-foreground"
                aria-label={visiblePasswordFields.new ? 'Hide new password' : 'Show new password'}
              >
                {visiblePasswordFields.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwords.new && (
              <div className="mt-3 grid gap-2 rounded-lg border border-border bg-background/60 p-3 text-xs text-foreground-muted sm:grid-cols-2">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-center gap-2 ${
                      check.passed ? 'text-accent-green' : 'text-foreground-muted'
                    }`}
                  >
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="block text-sm font-medium mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                id="confirm-new-password"
                name="confirmNewPassword"
                aria-label="Confirm new password"
                type={visiblePasswordFields.confirm ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="input pr-12 text-sm"
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-subtle transition hover:bg-background-elevated hover:text-foreground"
                aria-label={visiblePasswordFields.confirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {visiblePasswordFields.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwords.confirm && !newPasswordsMatch && (
              <p className="mt-2 text-xs text-accent-red">New passwords do not match yet.</p>
            )}
          </div>

          {passwordMessage.text && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                passwordMessage.type === 'success'
                  ? 'border-accent-green/20 bg-accent-green/10 text-accent-green'
                  : 'border-accent-red/20 bg-accent-red/10 text-accent-red'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Change Password
          </button>
        </form>
      </div>

      {/* Active Sessions */}
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Active Sessions
          </h2>
          {sessions.some((session) => !session.isCurrent) && (
            <button
              onClick={handleRevokeAllSessions}
              disabled={sessionActionId === 'all'}
              className="text-accent-red text-sm hover:underline disabled:opacity-50"
            >
              {sessionActionId === 'all' ? 'Revoking...' : 'Revoke all other sessions'}
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-foreground-muted">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-xl bg-background-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-background p-2 text-foreground-muted">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">
                        {session.userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop'}
                      </p>
                      {session.isCurrent && (
                        <span className="rounded bg-accent-green/10 px-2 py-0.5 text-xs text-accent-green">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-foreground-muted">
                      {session.ipAddress || 'Unknown IP'} • {new Date(session.createdAt).toLocaleString()}
                    </p>
                    {session.userAgent && (
                      <p className="mt-1 truncate text-xs text-foreground-subtle">
                        {session.userAgent}
                      </p>
                    )}
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={sessionActionId === session.id}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent-red/30 px-3 py-2 text-sm text-accent-red transition hover:bg-accent-red/10 disabled:opacity-50"
                  >
                    {sessionActionId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
