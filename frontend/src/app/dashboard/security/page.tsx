'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Smartphone,
  Mail,
  MessageSquare,
  Key,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { otpApi } from '@/lib/api';

export default function SecurityPage() {
  const { accessToken, user } = useAuthStore();
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
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [accessToken]);

  const fetchStatus = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const result = await otpApi.getStatus(accessToken);
      if (result.data) {
        setStatus({ ...result.data, twoFactorMethod: result.data.twoFactorMethod || null, hasPhone: false, });
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
      const result = await otpApi.setupTOTP(accessToken);
      if (result.data) {
        setTotpData(result.data);
        setSetupStep('setup');
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
      const result = await otpApi.enableTOTP(accessToken, verifyCode);
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
      const result = await otpApi.disableTOTP(accessToken, disablePassword);
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
            onClick={() => {
              setSetupStep('idle');
              setTotpData(null);
              setVerifyCode('');
            }}
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
              onClick={() => {
                setSetupStep('idle');
                setBackupCodes([]);
                setTotpData(null);
              }}
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
            <a href="/dashboard/settings" className="text-primary text-sm hover:underline">
              Change
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
