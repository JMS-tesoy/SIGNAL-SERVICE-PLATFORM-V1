'use client';

import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  ariaLabel: string;
  value: string;
  visible: boolean;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

export function PasswordField({
  id,
  name,
  label,
  ariaLabel,
  value,
  visible,
  placeholder,
  autoComplete,
  minLength,
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          aria-label={ariaLabel}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input pr-12 text-sm"
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          minLength={minLength}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-subtle transition hover:bg-background-elevated hover:text-foreground"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
