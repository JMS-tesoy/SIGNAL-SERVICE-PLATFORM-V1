import { ClipboardCheck, Copy } from "lucide-react";

type CopyPillProps = {
  label: string;
  value: string;
  copiedValue: string;
  onCopy: (value: string, label: string) => void;
};

export function CopyPill({ label, value, copiedValue, onCopy }: CopyPillProps) {
  return (
    <button
      type="button"
      onClick={() => onCopy(value, label)}
      className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2 text-left text-sm transition hover:bg-background-elevated active:scale-[0.99]"
    >
      {copiedValue === label ? (
        <ClipboardCheck className="h-4 w-4 text-accent-green" />
      ) : (
        <Copy className="h-4 w-4 text-primary" />
      )}
      <span className="text-foreground-muted">{label}:</span>
      <span className="truncate font-mono text-foreground">{value}</span>
    </button>
  );
}
