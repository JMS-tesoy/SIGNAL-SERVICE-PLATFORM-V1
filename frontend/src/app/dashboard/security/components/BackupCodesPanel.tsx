'use client';

import { motion } from 'framer-motion';
import { Check, CheckCircle, Copy } from 'lucide-react';

type BackupCodesPanelProps = {
  backupCodes: string[];
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
  onDone: () => void;
};

export function BackupCodesPanel({ backupCodes, copiedKey, onCopy, onDone }: BackupCodesPanelProps) {
  const backupCodesCopied = copiedKey === 'backup-codes';

  return (
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
        {backupCodes.map((code) => (
          <code key={code} className="font-mono text-sm">
            {code}
          </code>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={() => onCopy('backup-codes', backupCodes.join('\n'))}
          className={`btn-secondary flex items-center gap-2 transition active:scale-95 ${
            backupCodesCopied ? 'border-accent-green/30 bg-accent-green/10 text-accent-green' : ''
          }`}
        >
          {backupCodesCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {backupCodesCopied ? 'Copied' : 'Copy All'}
        </button>
        <button type="button" onClick={onDone} className="btn-primary">
          Done
        </button>
      </div>
    </motion.div>
  );
}
