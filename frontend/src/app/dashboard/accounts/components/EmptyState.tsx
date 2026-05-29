import { Laptop, Plus } from "lucide-react";

type EmptyStateProps = {
  title: string;
  onAdd?: () => void;
};

export function EmptyState({ title, onAdd }: EmptyStateProps) {
  return (
    <div className="card text-center py-12">
      <Laptop className="w-16 h-16 mx-auto mb-4 text-foreground-subtle opacity-50" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-foreground-muted mb-6">
        Add or filter MT5 accounts to manage EA connections from this page.
      </p>
      {onAdd && (
        <button onClick={onAdd} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      )}
    </div>
  );
}
