'use client';

import { Loader2, Shield, Smartphone } from 'lucide-react';
import { SecurityStatus, SetupStep } from '../types';

type TwoFactorCardProps = {
  status: SecurityStatus | null;
  setupStep: SetupStep;
  actionLoading: boolean;
  onSetupTOTP: () => void;
  onShowDisable: () => void;
};

export function TwoFactorCard({
  status,
  setupStep,
  actionLoading,
  onSetupTOTP,
  onShowDisable,
}: TwoFactorCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              status?.twoFactorEnabled ? 'bg-accent-green/10' : 'bg-accent-yellow/10'
            }`}
          >
            <Shield
              className={`w-7 h-7 ${
                status?.twoFactorEnabled ? 'text-accent-green' : 'text-accent-yellow'
              }`}
            />
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
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            status?.twoFactorEnabled
              ? 'bg-accent-green/10 text-accent-green'
              : 'bg-accent-yellow/10 text-accent-yellow'
          }`}
        >
          {status?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {!status?.twoFactorEnabled && setupStep === 'idle' && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-medium mb-4">Choose Authentication Method</h3>
          <div className="grid gap-4">
            <button
              type="button"
              onClick={onSetupTOTP}
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
            type="button"
            onClick={onShowDisable}
            className="text-accent-red hover:underline text-sm"
          >
            Disable Two-Factor Authentication
          </button>
        </div>
      )}
    </div>
  );
}
