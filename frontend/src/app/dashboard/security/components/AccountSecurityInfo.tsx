'use client';

import { Key, Mail } from 'lucide-react';
import { SecurityStatus } from '../types';

type AccountSecurityInfoProps = {
  status: SecurityStatus | null;
};

export function AccountSecurityInfo({ status }: AccountSecurityInfoProps) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Account Security</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-foreground-muted" />
            <span>Email Verification</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-sm ${
                status?.emailVerified
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'bg-accent-yellow/10 text-accent-yellow'
              }`}
            >
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
  );
}
