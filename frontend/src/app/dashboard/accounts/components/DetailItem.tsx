import type { ElementType } from "react";

type DetailItemProps = {
  icon: ElementType;
  label: string;
  value: string;
};

export function DetailItem({ icon: Icon, label, value }: DetailItemProps) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-foreground-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}
