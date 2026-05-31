"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle,
  Laptop,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { subscriptionApi, userApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { AccountSection } from "./components/AccountSection";
import { AddAccountModal } from "./components/AddAccountModal";
import { ConfirmKeyActionModal } from "./components/ConfirmKeyActionModal";
import { EmptyState } from "./components/EmptyState";
import { SummaryCard } from "./components/SummaryCard";
import type {
  AccountFilter,
  AccountPlanUsage,
  AccountValidation,
  GeneratedKey,
  KeyAction,
  MessageState,
  MT5Account,
  NewAccountForm,
} from "./types";
import { getHealthState } from "./utils";

const INITIAL_NEW_ACCOUNT: NewAccountForm = {
  accountId: "",
  accountType: "SLAVE",
  accountEnvironment: "DEMO",
  broker: "",
  server: "",
};

const FILTERS: Array<[AccountFilter, string]> = [
  ["ALL", "All"],
  ["CONNECTED", "Connected"],
  ["OFFLINE", "Offline"],
  ["MASTER", "Master"],
  ["SLAVE", "Slave"],
];

export default function AccountsPage() {
  const { accessToken, subscription, setSubscription } = useAuthStore();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey>(null);
  const [copiedValue, setCopiedValue] = useState("");
  const [filter, setFilter] = useState<AccountFilter>("ALL");
  const [accountPlanUsage, setAccountPlanUsage] = useState<AccountPlanUsage>(null);
  const [message, setMessage] = useState<MessageState>({ type: "", text: "" });
  const [selectedMasterIds, setSelectedMasterIds] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{
    account: MT5Account;
    type: KeyAction;
  } | null>(null);

  const [newAccount, setNewAccount] = useState<NewAccountForm>(INITIAL_NEW_ACCOUNT);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isFreeAccount = !subscription || subscription.tier.name === "free";
  const subscriptionStatus = subscription?.status?.toUpperCase() ?? "";
  const isTrialAccount = subscriptionStatus === "TRIAL" || subscriptionStatus === "TRIALING";
  const canUseLiveAccounts =
    subscriptionStatus === "ACTIVE" && subscription?.tier.name !== "free";
  const maxSlaveAccounts =
    accountPlanUsage?.maxSlaveAccounts ?? subscription?.tier.maxSlaveAccounts ?? 1;
  const accountId = newAccount.accountId.trim();
  const broker = newAccount.broker.trim();
  const server = newAccount.server.trim();
  const duplicateAccount = accounts.some((account) => account.accountId === accountId);

  const accountValidation: AccountValidation = {
    accountId: !accountId
      ? "MT5 Login ID is required."
      : !/^\d+$/.test(accountId)
        ? "MT5 Login ID should contain numbers only."
        : accountId.length < 5
          ? "MT5 Login ID should be at least 5 digits."
          : accountId.length > 50
            ? "MT5 Login ID must be 50 digits or fewer."
            : duplicateAccount
              ? "This MT5 Login ID is already connected."
              : "",
    server: !server
      ? "Server is required."
      : server.length < 3
        ? "Server should be at least 3 characters."
        : server.length > 100
          ? "Server must be 100 characters or fewer."
          : "",
    broker: broker.length > 100 ? "Broker must be 100 characters or fewer." : "",
  };

  const addFormIsValid =
    !accountValidation.accountId &&
    !accountValidation.server &&
    !accountValidation.broker &&
    !(isFreeAccount && newAccount.accountType === "MASTER") &&
    (newAccount.accountEnvironment !== "LIVE" || canUseLiveAccounts);

  const fetchAccounts = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const result = await userApi.getMT5Accounts(accessToken);
      if (result.data) {
        const loadedAccounts = result.data.accounts;

        setAccounts(loadedAccounts);
        setAccountPlanUsage(result.data.planUsage);
        setSelectedMasterIds((current) => {
          const next = { ...current };

          loadedAccounts.forEach((account) => {
            if (account.accountType === "SLAVE") {
              next[account.id] = next[account.id] || account.allowedMasterAccountId || "";
            }
          });

          return next;
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load MT5 accounts." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [accessToken]);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!accessToken || subscription) return;
      const result = await subscriptionApi.getCurrent(accessToken);
      if (result.data?.subscription) {
        setSubscription(result.data.subscription);
      }
    };

    fetchSubscription();
  }, [accessToken, setSubscription, subscription]);

  const accountStats = useMemo(() => {
    const connected = accounts.filter((account) => getHealthState(account).key === "CONNECTED").length;
    const slave = accounts.filter((account) => account.accountType === "SLAVE").length;
    const master = accounts.filter((account) => account.accountType === "MASTER").length;

    return {
      total: accounts.length,
      connected,
      offline: accounts.length - connected,
      slave,
      master,
    };
  }, [accounts]);

  const apiKeyChecklistText = useMemo(() => {
    if (accountStats.master > 0 && accountStats.slave === 0) {
      return "Generate an API key and copy it into the Sender EA.";
    }

    if (accountStats.slave > 0 && accountStats.master === 0) {
      return "Generate an API key and copy it into the Receiver EA.";
    }

    if (isFreeAccount) {
      return "Generate an API key and copy it into the Receiver EA. Sender EA requires a paid plan.";
    }

    return "Generate an API key and copy it into the Sender or Receiver EA.";
  }, [accountStats.master, accountStats.slave, isFreeAccount]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const health = getHealthState(account);
      if (filter === "CONNECTED") return health.key === "CONNECTED";
      if (filter === "OFFLINE") return health.key !== "CONNECTED";
      if (filter === "MASTER") return account.accountType === "MASTER";
      if (filter === "SLAVE") return account.accountType === "SLAVE";
      return true;
    });
  }, [accounts, filter]);

  const allMasterAccounts = accounts.filter((account) => account.accountType === "MASTER");
  const masterAccounts = filteredAccounts.filter((account) => account.accountType === "MASTER");
  const slaveAccounts = filteredAccounts.filter((account) => account.accountType === "SLAVE");

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(label);
  };

  const updateAccountKeyState = (accountId: string, hasApiKey: boolean) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === accountId ? { ...account, hasApiKey } : account
      )
    );
  };

  const handleAddAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;

    setActionLoading("add");
    setError("");
    setMessage({ type: "", text: "" });

    if (!addFormIsValid) {
      setError(
        accountValidation.accountId ||
          accountValidation.server ||
          accountValidation.broker ||
          (newAccount.accountEnvironment === "LIVE" && isTrialAccount
            ? "Trial accounts can only use demo MT5/MT4 accounts. Upgrade to connect live accounts."
            : "") ||
          (newAccount.accountEnvironment === "LIVE"
            ? "Your subscription plan does not allow live MT5/MT4 accounts. Upgrade to connect live accounts."
            : "") ||
          "Please fix the highlighted fields."
      );
      setActionLoading(null);
      return;
    }

    try {
      const result = await userApi.addMT5Account(accessToken, {
        accountId,
        accountType: newAccount.accountType,
        accountEnvironment: newAccount.accountEnvironment,
        broker: broker || undefined,
        server,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setShowAddModal(false);
        setNewAccount(INITIAL_NEW_ACCOUNT);
        setMessage({ type: "success", text: "MT5 Login ID added. Generate an API key to verify it from your EA." });
        fetchAccounts();
      }
    } catch {
      setError("Failed to add account.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!accessToken) return;
    if (!confirm("Remove this MT5 account? Any EA using its API key will stop connecting.")) return;

    setActionLoading(accountId);
    setMessage({ type: "", text: "" });

    try {
      const result = await userApi.deleteMT5Account(accessToken, accountId);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setAccounts((current) => current.filter((account) => account.id !== accountId));
        if (generatedKey?.id === accountId) setGeneratedKey(null);
        setMessage({ type: "success", text: "MT5 account removed." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete account." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateKey = async (account: MT5Account, forceConfirm = false) => {
    if (!accessToken) return;

    if ((account.hasApiKey || forceConfirm) && !confirmAction) {
      setConfirmAction({ account, type: "regenerate" });
      return;
    }

    setGeneratedKey(null);
    setActionLoading(account.id);
    setMessage({ type: "", text: "" });
    setConfirmAction(null);

    try {
      const result = await userApi.generateMT5ApiKey(accessToken, account.id);
      if (result.error || !result.data?.apiKey) {
        setMessage({ type: "error", text: result.error || "Failed to generate API key." });
      } else {
        setGeneratedKey({ id: account.id, key: result.data.apiKey });
        updateAccountKeyState(account.id, true);
        setMessage({ type: "success", text: "API key generated. Copy it before leaving this panel." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to generate API key." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeKey = async (account: MT5Account, forceConfirm = false) => {
    if (!accessToken) return;

    if (!forceConfirm && !confirmAction) {
      setConfirmAction({ account, type: "revoke" });
      return;
    }

    setActionLoading(account.id);
    setMessage({ type: "", text: "" });
    setConfirmAction(null);

    try {
      const result = await userApi.revokeMT5ApiKey(accessToken, account.id);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        if (generatedKey?.id === account.id) setGeneratedKey(null);
        updateAccountKeyState(account.id, false);
        setMessage({ type: "success", text: "API key revoked. Existing EAs using it will stop connecting." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to revoke API key." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMasterSelectionChange = (receiverId: string, masterAccountId: string) => {
    setSelectedMasterIds((current) => ({
      ...current,
      [receiverId]: masterAccountId,
    }));
  };

  const handleAssignMaster = async (receiverId: string) => {
    if (!accessToken) return;

    const masterAccountId = selectedMasterIds[receiverId];

    if (!masterAccountId) {
      setMessage({ type: "error", text: "Choose a Master account before saving this Receiver." });
      return;
    }

    setActionLoading(`assign-${receiverId}`);
    setMessage({ type: "", text: "" });

    try {
      const result = await userApi.assignMT5ReceiverMaster(accessToken, receiverId, masterAccountId);

      if (result.error || !result.data?.account) {
        setMessage({ type: "error", text: result.error || "Failed to save Receiver master assignment." });
      } else {
        setAccounts((current) =>
          current.map((account) =>
            account.id === receiverId ? result.data!.account : account
          )
        );
        setMessage({ type: "success", text: "Receiver master assignment saved." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save Receiver master assignment." });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">MT5 Accounts</h1>
          <p className="text-foreground-muted">Manage account connections, EA setup, and API keys.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchAccounts} disabled={isLoading} className="btn-secondary flex items-center gap-2 active:scale-95">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 active:scale-95">
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {message.text && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-accent-green/20 bg-accent-green/10 text-accent-green"
              : "border-accent-red/20 bg-accent-red/10 text-accent-red"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Laptop} label="Total accounts" value={accountStats.total.toString()} />
        <SummaryCard icon={Radio} label="Connected" value={accountStats.connected.toString()} tone="green" />
        <SummaryCard icon={XCircle} label="Offline or stale" value={accountStats.offline.toString()} tone="yellow" />
        <SummaryCard icon={ShieldAlert} label="Slave usage" value={`${accountStats.slave}/${maxSlaveAccounts}`} />
      </div>

      <div className="card bg-primary/5 border-primary/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-primary" />
              Connection checklist
            </h3>
            <ol className="text-sm text-foreground-muted space-y-1 list-decimal list-inside">
              <li>Add the exact MT5 Login ID and broker server shown in your terminal.</li>
              <li>{apiKeyChecklistText}</li>
              <li>Verification happens after the matching MT5 terminal sends heartbeat.</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-lg border px-3 py-2 text-sm transition active:scale-95 ${
              filter === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground-muted hover:bg-background-elevated hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState onAdd={() => setShowAddModal(true)} title="No accounts connected" />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState title="No accounts match this filter" />
      ) : (
        <div className="space-y-6">
          {masterAccounts.length > 0 && (
            <AccountSection
              title="Master Accounts (Signal Providers)"
              dotClassName="bg-accent-purple"
              accounts={masterAccounts}
              masterOptions={allMasterAccounts}
              selectedMasterIds={selectedMasterIds}
              isTrialAccount={isTrialAccount}
              generatedKey={generatedKey}
              copiedValue={copiedValue}
              actionLoading={actionLoading}
              onCopy={copyText}
              onDelete={handleDeleteAccount}
              onGenerate={handleGenerateKey}
              onRevoke={handleRevokeKey}
              onMasterSelectionChange={handleMasterSelectionChange}
              onAssignMaster={handleAssignMaster}
            />
          )}

          {slaveAccounts.length > 0 && (
            <AccountSection
              title="Slave Accounts (Signal Receivers)"
              dotClassName="bg-primary"
              accounts={slaveAccounts}
              masterOptions={allMasterAccounts}
              selectedMasterIds={selectedMasterIds}
              isTrialAccount={isTrialAccount}
              generatedKey={generatedKey}
              copiedValue={copiedValue}
              actionLoading={actionLoading}
              onCopy={copyText}
              onDelete={handleDeleteAccount}
              onGenerate={handleGenerateKey}
              onRevoke={handleRevokeKey}
              onMasterSelectionChange={handleMasterSelectionChange}
              onAssignMaster={handleAssignMaster}
            />
          )}
        </div>
      )}

      <AddAccountModal
        open={showAddModal}
        newAccount={newAccount}
        validation={accountValidation}
        error={error}
        isFreeAccount={isFreeAccount}
        isTrialAccount={isTrialAccount}
        canUseLiveAccounts={canUseLiveAccounts}
        isValid={addFormIsValid}
        isLoading={actionLoading === "add"}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAccount}
        onChange={setNewAccount}
        onError={setError}
      />

      <ConfirmKeyActionModal
        action={confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "revoke") {
            handleRevokeKey(confirmAction.account, true);
          } else {
            handleGenerateKey(confirmAction.account, true);
          }
        }}
      />
    </div>
  );
}
