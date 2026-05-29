import { AlertCircle } from "lucide-react";

type ValidatedInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  error: string;
  placeholder: string;
  inputMode?: "numeric";
  helpText?: string;
  onChange: (value: string) => void;
};

export function ValidatedInput({
  id,
  name,
  label,
  value,
  error,
  placeholder,
  inputMode,
  helpText,
  onChange,
}: ValidatedInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-2">{label}</label>
      <input
        id={id}
        name={name}
        aria-label={label.replace(" *", "").replace(" (Optional)", "")}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`input ${error ? "border-accent-red focus:border-accent-red focus:ring-accent-red" : ""}`}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        maxLength={100}
      />
      {helpText && !error && (
        <p className="mt-2 text-xs leading-5 text-foreground-muted">{helpText}</p>
      )}
      {error && (
        <p className="mt-2 flex items-start gap-2 text-xs text-accent-red">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
