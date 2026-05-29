'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type DisableTwoFactorModalProps = {
  disablePassword: string;
  actionLoading: boolean;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DisableTwoFactorModal({
  disablePassword,
  actionLoading,
  onPasswordChange,
  onCancel,
  onConfirm,
}: DisableTwoFactorModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-background-secondary rounded-xl p-6 w-full max-w-md border border-border"
        onClick={(event) => event.stopPropagation()}
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
          onChange={(event) => onPasswordChange(event.target.value)}
          className="input mb-4"
          placeholder="Enter your password"
        />

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!disablePassword || actionLoading}
            className="flex-1 bg-accent-red hover:bg-accent-red/80 text-white py-2 px-4 rounded-lg font-semibold transition"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Disable 2FA'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
