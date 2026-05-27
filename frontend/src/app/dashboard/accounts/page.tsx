"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Laptop,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { subscriptionApi, userApi } from "@/lib/api";
import type { MT5PlanUsageResponse } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

type AccountFilter = "ALL" | "CONNECTED" | "OFFLINE" | "MASTER" | "SLAVE";
type KeyAction = "generate" | "regenerate" | "revoke";

interface MT5Account {
  id: string;
  accountId: string;
  accountType: "MASTER" | "SLAVE";
  broker: string | null;
  server: string | null;
  isConnected: boolean;
  lastHeartbeat: string | null;
  hasApiKey?: boolean;
  balance: number | null;
  equity: number | null;
  profit: number | null;
}

type GeneratedKey = {
  id: string;
  key: string;
} | null;

function getHeartbeatAgeMinutes(lastHeartbeat: string | null) {
  if (!lastHeartbeat) return null;
  return Math.max(
    0,
    Math.round((Date.now() - new Date(lastHeartbeat).getTime()) / 1000 / 60)
  );
}

function getHealthState(account: MT5Account) {
  const age = getHeartbeatAgeMinutes(account.lastHeartbeat);

  if (!account.lastHeartbeat) {
    return {
      key: "NEVER",
      label: "Never connected",
      tone: "text-foreground-muted",
      bg: "bg-foreground-subtle/10",
      icon: XCircle,
    };
  }

  if (account.isConnected && age !== null && age <= 5) {
    return {
      key: "CONNECTED",
      label: "Connected",
      tone: "text-accent-green",
      bg: "bg-accent-green/10",
      icon: CheckCircle,
    };
  }

  if (age !== null && age <= 15) {
    return {
      key: "RECENT",
      label: "Recently active",
      tone: "text-primary",
      bg: "bg-primary/10",
      icon: Activity,
    };
  }

  return {
    key: "STALE",
    label: "Stale",
    tone: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
    icon: Clock,
  };
}

function formatHeartbeat(lastHeartbeat: string | null) {
  const age = getHeartbeatAgeMinutes(lastHeartbeat);
  if (age === null) return "No heartbeat received";
  if (age < 1) return "Just now";
  if (age === 1) return "1 minute ago";
  if (age < 60) return `${age} minutes ago`;
  const hours = Math.floor(age / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

function money(value: number | null) {
  if (value === null || Number.isNaN(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

export default function AccountsPage() {
  const { accessToken, subscription, setSubscription } = useAuthStore();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey>(null);
  const [copiedValue, setCopiedValue] = useState("");
  const [filter, setFilter] = useState<AccountFilter>("ALL");
  const [accountPlanUsage, setAccountPlanUsage] = useState<MT5PlanUsageResponse | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmAction, setConfirmAction] = useState<{
    account: MT5Account;
    type: KeyAction;
  } | null>(null);

  const [newAccount, setNewAccount] = useState({
    accountId: "",
    accountType: "SLAVE" as "MASTER" | "SLAVE",
    broker: "",
    server: "",
  });
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isFreeAccount = !subscription || subscription.tier.name === "free";
  const maxSlaveAccounts =
    accountPlanUsage?.maxSlaveAccounts ?? subscription?.tier.maxSlaveAccounts ?? 1;
  const accountId = newAccount.accountId.trim();
  const broker = newAccount.broker.trim();
  const server = newAccount.server.trim();
  const duplicateAccount = accounts.some((account) => account.accountId === accountId);

  const accountValidation = {
    accountId: !accountId
      ? "Account ID is required."
      : !/^\d+$/.test(accountId)
        ? "Account ID should contain numbers only."
        : accountId.length < 5
          ? "Account ID should be at least 5 digits."
          : accountId.length > 50
            ? "Account ID must be 50 digits or fewer."
            : duplicateAccount
              ? "This MT5 account is already connected."
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
    !(isFreeAccount && newAccount.accountType === "MASTER");

  const fetchAccounts = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const result = await userApi.getMT5Accounts(accessToken);
      if (result.data) {
        setAccounts(result.data.accounts);
        setAccountPlanUsage(result.data.planUsage);
      }
    } catch (error) {
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
    return {
      total: accounts.length,
      connected,
      offline: accounts.length - connected,
      slave,
    };
  }, [accounts]);

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

  const masterAccounts = filteredAccounts.filter((account) => account.accountType === "MASTER");
  const slaveAccounts = filteredAccounts.filter((account) => account.accountType === "SLAVE");

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(label);
    window.setTimeout(() => setCopiedValue(""), 1600);
  };

  const updateAccountKeyState = (accountId: string, hasApiKey: boolean) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === accountId ? { ...account, hasApiKey } : account
      )
    );
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setActionLoading("add");
    setError("");
    setMessage({ type: "", text: "" });

    if (!addFormIsValid) {
      setError(
        accountValidation.accountId ||
          accountValidation.server ||
          accountValidation.broker ||
          "Please fix the highlighted fields."
      );
      setActionLoading(null);
      return;
    }

    try {
      const result = await userApi.addMT5Account(accessToken, {
        accountId,
        accountType: newAccount.accountType,
        broker: broker || undefined,
        server,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setShowAddModal(false);
        setNewAccount({ accountId: "", accountType: "SLAVE", broker: "", server: "" });
        setMessage({ type: "success", text: "MT5 account added. Generate an API key to connect your EA." });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">MT5 Accounts</h1>
          <p className="text-foreground-muted">Manage account connections, EA setup, and API keys.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchAccounts} disabled={isLoading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
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
              <li>Add the exact MT5 account ID and broker server.</li>
              <li>Generate an API key and copy it into the Sender or Receiver EA.</li>
              <li>Use the backend URL below in the EA WebRequest allowlist.</li>
              <li>Watch this page for heartbeat and connection status.</li>
            </ol>
          </div>
          <CopyPill label="Backend URL" value={API_BASE_URL} onCopy={copyText} copiedValue={copiedValue} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["ALL", "All"],
          ["CONNECTED", "Connected"],
          ["OFFLINE", "Offline"],
          ["MASTER", "Master"],
          ["SLAVE", "Slave"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value as AccountFilter)}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
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
              generatedKey={generatedKey}
              copiedValue={copiedValue}
              actionLoading={actionLoading}
              onCopy={copyText}
              onDelete={handleDeleteAccount}
              onGenerate={handleGenerateKey}
              onRevoke={handleRevokeKey}
            />
          )}

          {slaveAccounts.length > 0 && (
            <AccountSection
              title="Slave Accounts (Signal Receivers)"
              dotClassName="bg-primary"
              accounts={slaveAccounts}
              generatedKey={generatedKey}
              copiedValue={copiedValue}
              actionLoading={actionLoading}
              onCopy={copyText}
              onDelete={handleDeleteAccount}
              onGenerate={handleGenerateKey}
              onRevoke={handleRevokeKey}
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "primary" | "green" | "yellow";
}) {
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

function EmptyState({ title, onAdd }: { title: string; onAdd?: () => void }) {
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

function CopyPill({
  label,
  value,
  copiedValue,
  onCopy,
}: {
  label: string;
  value: string;
  copiedValue: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(value, label)}
      className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2 text-left text-sm transition hover:bg-background-elevated"
    >
      {copiedValue === label ? <ClipboardCheck className="h-4 w-4 text-accent-green" /> : <Copy className="h-4 w-4 text-primary" />}
      <span className="text-foreground-muted">{label}:</span>
      <span className="truncate font-mono text-foreground">{value}</span>
    </button>
  );
}

function AccountSection(props: {
  title: string;
  dotClassName: string;
  accounts: MT5Account[];
  generatedKey: GeneratedKey;
  copiedValue: string;
  actionLoading: string | null;
  onCopy: (value: string, label: string) => void;
  onDelete: (accountId: string) => void;
  onGenerate: (account: MT5Account) => void;
  onRevoke: (account: MT5Account) => void;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${props.dotClassName}`} />
        {props.title}
      </h2>
      <div className="grid gap-4">
        {props.accounts.map((account) => (
          <AccountCard key={account.id} account={account} {...props} />
        ))}
      </div>
    </section>
  );
}

function AccountCard({
  account,
  generatedKey,
  copiedValue,
  actionLoading,
  onCopy,
  onDelete,
  onGenerate,
  onRevoke,
}: {
  account: MT5Account;
  generatedKey: GeneratedKey;
  copiedValue: string;
  actionLoading: string | null;
  onCopy: (value: string, label: string) => void;
  onDelete: (accountId: string) => void;
  onGenerate: (account: MT5Account) => void;
  onRevoke: (account: MT5Account) => void;
}) {
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const health = getHealthState(account);
  const HealthIcon = health.icon;
  const keyForThisAccount = generatedKey?.id === account.id ? generatedKey.key : null;
  const configEndpoint = `${API_BASE_URL}/api/signals`;
  const pendingEndpoint = `${API_BASE_URL}/api/signals/pending?account_id=${account.accountId}`;

  return (
    <motion.div layout className="card flex flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${health.bg}`}>
            <Laptop className={`w-6 h-6 ${health.tone}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{account.accountId}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${account.accountType === "MASTER" ? "bg-accent-purple/10 text-accent-purple" : "bg-primary/10 text-primary"}`}>
                {account.accountType}
              </span>
              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${health.bg} ${health.tone}`}>
                <HealthIcon className="h-3.5 w-3.5" />
                {health.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground-muted">
              {account.broker || "Unknown broker"} • {account.server || "Unknown server"}
            </p>
            <p className="mt-1 text-xs text-foreground-subtle">Last heartbeat: {formatHeartbeat(account.lastHeartbeat)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-right">
            <p className="font-mono text-sm">{money(account.balance)}</p>
            <p className={`text-xs ${(account.profit || 0) >= 0 ? "text-accent-green" : "text-accent-red"}`}>
              {(account.profit || 0) >= 0 ? "+" : ""}
              {(account.profit || 0).toFixed(2)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onGenerate(account)}
              title={account.hasApiKey ? "Regenerate API Key" : "Generate API Key"}
              disabled={actionLoading === account.id}
              className="p-2 hover:bg-primary/10 rounded-lg text-foreground-muted hover:text-primary transition"
            >
              {actionLoading === account.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
            </button>
            {account.hasApiKey && (
              <button
                onClick={() => onRevoke(account)}
                title="Revoke API Key"
                disabled={actionLoading === account.id}
                className="p-2 hover:bg-accent-yellow/10 rounded-lg text-foreground-muted hover:text-accent-yellow transition"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => onDelete(account.id)}
              title="Delete Account"
              disabled={actionLoading === account.id}
              className="p-2 hover:bg-accent-red/10 rounded-lg text-foreground-muted hover:text-accent-red transition"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <DetailItem icon={Server} label="Server" value={account.server || "Not set"} />
        <DetailItem icon={Info} label="Broker" value={account.broker || "Not set"} />
        <DetailItem icon={Key} label="API key" value={account.hasApiKey ? "Generated" : "Not generated"} />
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">EA configuration</p>
            <p className="text-xs text-foreground-muted">
              Copy these values into your {account.accountType === "MASTER" ? "Sender" : "Receiver"} EA.
            </p>
          </div>
          {!account.hasApiKey && !keyForThisAccount && (
            <span className="rounded-lg bg-accent-yellow/10 px-2.5 py-1 text-xs text-accent-yellow">
              Generate a key first
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <CopyPill label="account_id" value={account.accountId} onCopy={onCopy} copiedValue={copiedValue} />
          <CopyPill label={account.accountType === "MASTER" ? "Signals URL" : "Pending URL"} value={account.accountType === "MASTER" ? configEndpoint : pendingEndpoint} onCopy={onCopy} copiedValue={copiedValue} />
          <CopyPill label="WebRequest URL" value={API_BASE_URL} onCopy={onCopy} copiedValue={copiedValue} />
        </div>
      </div>

      {getHealthState(account).key === "NEVER" && (
        <div className="rounded-xl border border-accent-yellow/20 bg-accent-yellow/10 px-4 py-3 text-sm text-accent-yellow">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Next step: generate an API key, add this account ID and server to your EA, then start MT5 AutoTrading.</span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {keyForThisAccount && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-start gap-2">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">API key generated</p>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">
                    Copy it now. For security, this key will not be shown again after you leave this panel.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    id={`generated-api-key-${account.id}`}
                    name="generatedApiKey"
                    aria-label="Generated MT5 API key"
                    readOnly
                    type={showGeneratedKey ? "text" : "password"}
                    value={keyForThisAccount}
                    className="input h-11 pr-12 font-mono text-sm"
                    onClick={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeneratedKey((visible) => !visible)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-subtle transition hover:bg-background-elevated hover:text-foreground"
                    aria-label={showGeneratedKey ? "Hide API key" : "Reveal API key"}
                  >
                    {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button onClick={() => onCopy(keyForThisAccount, "API key")} className="btn-secondary flex h-11 items-center justify-center gap-2 px-4 text-sm">
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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

function AddAccountModal({
  open,
  newAccount,
  validation,
  error,
  isFreeAccount,
  isValid,
  isLoading,
  onClose,
  onSubmit,
  onChange,
  onError,
}: {
  open: boolean;
  newAccount: { accountId: string; accountType: "MASTER" | "SLAVE"; broker: string; server: string };
  validation: { accountId: string; server: string; broker: string };
  error: string;
  isFreeAccount: boolean;
  isValid: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onChange: (account: { accountId: string; accountType: "MASTER" | "SLAVE"; broker: string; server: string }) => void;
  onError: (error: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-background-secondary rounded-xl p-6 w-full max-w-md border border-border" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Add MT5 Account</h2>
              <button onClick={onClose} className="p-2 hover:bg-background-elevated rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <ValidatedInput
                id="mt5-account-id"
                name="accountId"
                label="Account ID *"
                value={newAccount.accountId}
                error={validation.accountId}
                placeholder="e.g., 12345678"
                inputMode="numeric"
                onChange={(value) => onChange({ ...newAccount, accountId: value })}
              />

              <div>
                <label htmlFor="mt5-account-type" className="block text-sm font-medium mb-2">Account Type *</label>
                <select
                  id="mt5-account-type"
                  name="accountType"
                  value={newAccount.accountType}
                  onChange={(event) => {
                    if (isFreeAccount && event.target.value === "MASTER") {
                      onError("Master Signal Provider accounts require a paid plan.");
                      return;
                    }
                    onChange({ ...newAccount, accountType: event.target.value as "MASTER" | "SLAVE" });
                  }}
                  className="input"
                >
                  <option value="SLAVE">Slave (Signal Receiver)</option>
                  <option value="MASTER" disabled={isFreeAccount}>
                    Master (Signal Provider){isFreeAccount ? " - Paid plan required" : ""}
                  </option>
                </select>
                {isFreeAccount && (
                  <p className="mt-2 flex items-start gap-2 text-xs text-foreground-muted">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    Master Signal Provider is visible for reference, but disabled on Free accounts. Upgrade to enable signal provider accounts.
                  </p>
                )}
              </div>

              <ValidatedInput
                id="mt5-broker"
                name="broker"
                label="Broker (Optional)"
                value={newAccount.broker}
                error={validation.broker}
                placeholder="e.g., IC Markets"
                onChange={(value) => onChange({ ...newAccount, broker: value })}
              />

              <ValidatedInput
                id="mt5-server"
                name="server"
                label="Server *"
                value={newAccount.server}
                error={validation.server}
                placeholder="e.g., ICMarkets-Demo"
                onChange={(value) => onChange({ ...newAccount, server: value })}
              />

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading || !isValid} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Account"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ValidatedInput({
  id,
  name,
  label,
  value,
  error,
  placeholder,
  inputMode,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  error: string;
  placeholder: string;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
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
      {error && (
        <p className="mt-2 flex items-start gap-2 text-xs text-accent-red">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function ConfirmKeyActionModal({
  action,
  onCancel,
  onConfirm,
}: {
  action: { account: MT5Account; type: KeyAction } | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {action && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-md rounded-xl border border-border bg-background-secondary p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent-yellow/10 text-accent-yellow">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {action.type === "revoke" ? "Revoke API key?" : "Regenerate API key?"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-foreground-muted">
                  {action.type === "revoke"
                    ? "The EA using this key will stop connecting until a new key is generated and copied into MT5."
                    : "The old key will stop working immediately. You must copy the new key into your MT5 EA."}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onCancel} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="button" onClick={onConfirm} className="btn-primary flex-1">
                {action.type === "revoke" ? "Revoke key" : "Regenerate"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
