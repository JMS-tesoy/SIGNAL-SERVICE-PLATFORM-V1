import type { GeneratedKey, MT5Account } from "../types";
import { AccountCard } from "./AccountCard";

type AccountSectionProps = {
  title: string;
  dotClassName: string;
  accounts: MT5Account[];
  masterOptions: MT5Account[];
  selectedMasterIds: Record<string, string>;
  isTrialAccount: boolean;
  generatedKey: GeneratedKey;
  copiedValue: string;
  actionLoading: string | null;
  onCopy: (value: string, label: string) => void;
  onDelete: (accountId: string) => void;
  onGenerate: (account: MT5Account) => void;
  onRevoke: (account: MT5Account) => void;
  onMasterSelectionChange: (receiverId: string, masterAccountId: string) => void;
  onAssignMaster: (receiverId: string) => void;
};

export function AccountSection({ title, dotClassName, accounts, ...cardProps }: AccountSectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotClassName}`} />
        {title}
      </h2>
      <div className="grid gap-4">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} {...cardProps} />
        ))}
      </div>
    </section>
  );
}
