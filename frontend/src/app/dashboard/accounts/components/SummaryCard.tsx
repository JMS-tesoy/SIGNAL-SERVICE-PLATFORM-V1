import type { ElementType } from "react";

type SummaryCardProps = {
  icon: ElementType;
  label: string;
  value: string;
  tone?: "primary" | "green" | "yellow";
};

export function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: SummaryCardProps) {
  const toneClass =
    tone === "green"
      ? "bg-accent-green/10 text-accent-green"
      : tone === "yellow"
        ? "bg-accent-yellow/10 text-accent-yellow"
        : "bg-primary/10 text-primary";

  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-foreground-muted">{label}</p>
      </div>
    </div>
  );
}
