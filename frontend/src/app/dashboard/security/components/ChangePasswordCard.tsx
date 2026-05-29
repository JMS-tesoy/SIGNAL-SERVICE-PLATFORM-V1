'use client';

import { FormEvent } from 'react';
import { CheckCircle, Key, Loader2 } from 'lucide-react';
import {
  PasswordCheck,
  PasswordFields,
  PasswordMessage,
  VisiblePasswordFields,
} from '../types';
import { PasswordField } from './PasswordField';

type ChangePasswordCardProps = {
  passwords: PasswordFields;
  visiblePasswordFields: VisiblePasswordFields;
  passwordChecks: PasswordCheck[];
  newPasswordsMatch: boolean;
  passwordMessage: PasswordMessage;
  isChangingPassword: boolean;
  onSubmit: (event: FormEvent) => void;
  onPasswordsChange: (passwords: PasswordFields) => void;
  onToggleVisibility: (field: keyof VisiblePasswordFields) => void;
};

export function ChangePasswordCard({
  passwords,
  visiblePasswordFields,
  passwordChecks,
  newPasswordsMatch,
  passwordMessage,
  isChangingPassword,
  onSubmit,
  onPasswordsChange,
  onToggleVisibility,
}: ChangePasswordCardProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Key className="w-5 h-5 flex-shrink-0" />
        Change Password
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField
          id="current-password"
          name="currentPassword"
          label="Current Password"
          ariaLabel="Current password"
          value={passwords.current}
          visible={visiblePasswordFields.current}
          placeholder="Enter current password"
          autoComplete="current-password"
          onChange={(value) => onPasswordsChange({ ...passwords, current: value })}
          onToggleVisibility={() => onToggleVisibility('current')}
        />

        <div>
          <PasswordField
            id="new-password"
            name="newPassword"
            label="New Password"
            ariaLabel="New password"
            value={passwords.new}
            visible={visiblePasswordFields.new}
            placeholder="Create a strong password"
            autoComplete="new-password"
            minLength={8}
            onChange={(value) => onPasswordsChange({ ...passwords, new: value })}
            onToggleVisibility={() => onToggleVisibility('new')}
          />

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
          <PasswordField
            id="confirm-new-password"
            name="confirmNewPassword"
            label="Confirm New Password"
            ariaLabel="Confirm new password"
            value={passwords.confirm}
            visible={visiblePasswordFields.confirm}
            placeholder="Repeat new password"
            autoComplete="new-password"
            onChange={(value) => onPasswordsChange({ ...passwords, confirm: value })}
            onToggleVisibility={() => onToggleVisibility('confirm')}
          />

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
  );
}
