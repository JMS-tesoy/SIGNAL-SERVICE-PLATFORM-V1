'use client';

import { motion } from 'framer-motion';
import { Check, Copy, Loader2 } from 'lucide-react';
import { TotpData } from '../types';

type TotpSetupFlowProps = {
  totpData: TotpData;
  verifyCode: string;
  actionLoading: boolean;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
  onVerifyCodeChange: (value: string) => void;
  onVerifyAndEnable: () => void;
  onCancel: () => void;
};

export function TotpSetupFlow({
  totpData,
  verifyCode,
  actionLoading,
  copiedKey,
  onCopy,
  onVerifyCodeChange,
  onVerifyAndEnable,
  onCancel,
}: TotpSetupFlowProps) {
  const manualKeyCopied = copiedKey === 'manual-entry-key';

  return (
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
              type="button"
              onClick={() => onCopy('manual-entry-key', totpData.manualEntryKey)}
              title={manualKeyCopied ? 'Copied' : 'Copy'}
              className={`p-3 rounded-lg transition active:scale-95 ${
                manualKeyCopied
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'hover:bg-background-elevated'
              }`}
            >
              {manualKeyCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
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
            onChange={(event) => onVerifyCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input flex-1 text-center text-2xl font-mono tracking-widest"
            placeholder="000000"
            maxLength={6}
          />
          <button
            type="button"
            onClick={onVerifyAndEnable}
            disabled={verifyCode.length !== 6 || actionLoading}
            className="btn-primary px-8"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Enable'}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-foreground-muted hover:text-foreground text-sm"
      >
        ← Cancel setup
      </button>
    </motion.div>
  );
}
