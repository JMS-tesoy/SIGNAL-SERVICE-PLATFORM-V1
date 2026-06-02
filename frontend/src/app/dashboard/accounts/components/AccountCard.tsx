import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Laptop,
  Loader2,
  Radio,
  Server,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import type { GeneratedKey, MT5Account } from "../types";
import { formatHeartbeat, getHealthState, money } from "../utils";
import { CopyPill } from "./CopyPill";
import { DetailItem } from "./DetailItem";


type AccountWithLicense = MT5Account & {
  status?: string | null;
  licenseStatus?: string | null;
  subscriptionStatus?: string | null;
  plan?: string | null;
  planName?: string | null;
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  licenseExpiresAt?: string | null;
  subscriptionEndsAt?: string | null;
  currentPeriodEnd?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const getDaysRemaining = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
};

const toTitleCase = (value?: string | null) => {
  if (!value) return null;

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getLicenseValidity = (account: AccountWithLicense, eaTypeLabel: string) => {
  const subscriptionStatus = account.subscriptionStatus?.toUpperCase() ?? null;
  const licenseStatus = account.licenseStatus?.toUpperCase() ?? account.status?.toUpperCase() ?? "ACTIVE";
  const planLabel = account.planName || account.plan || toTitleCase(subscriptionStatus) || "Plan";
  const expiryDate =
    account.trialEndsAt ||
    account.licenseExpiresAt ||
    account.subscriptionEndsAt ||
    account.currentPeriodEnd ||
    account.expiresAt ||
    null;
  const formattedExpiry = formatDate(expiryDate);
  const daysRemaining = getDaysRemaining(expiryDate);

  if (["REVOKED", "BLOCKED", "SUSPENDED"].includes(licenseStatus)) {
    return {
      label: `${eaTypeLabel} license ${toTitleCase(licenseStatus)}`,
      duration: "EA access is disabled until this account is restored by an administrator.",
      tone: "border-accent-red/20 bg-accent-red/10 text-accent-red",
    };
  }

  if (["EXPIRED", "CANCELED", "CANCELLED", "PAST_DUE"].includes(subscriptionStatus || licenseStatus)) {
    return {
      label: `${eaTypeLabel} license not active`,
      duration: "EA access is blocked until the subscription or license is reactivated.",
      tone: "border-accent-red/20 bg-accent-red/10 text-accent-red",
    };
  }

  if (subscriptionStatus === "TRIAL") {
    return {
      label: `${eaTypeLabel} trial active`,
      duration:
        formattedExpiry && daysRemaining !== null
          ? daysRemaining >= 0
            ? `Trial ends on ${formattedExpiry} (${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining).`
            : `Trial ended on ${formattedExpiry}.`
          : "Trial access is active. No trial end date is currently shown.",
      tone: "border-primary/20 bg-primary/10 text-primary",
    };
  }

  if (subscriptionStatus === "FREE" || subscriptionStatus === "NONE" || planLabel.toLowerCase().includes("free")) {
    return {
      label: `${eaTypeLabel} free access`,
      duration: formattedExpiry
        ? `Free access is valid until ${formattedExpiry}.`
        : "Free access is active. No expiration date is currently shown.",
      tone: "border-accent-yellow/20 bg-accent-yellow/10 text-accent-yellow",
    };
  }

  return {
    label: `${eaTypeLabel} license active`,
    duration:
      formattedExpiry && daysRemaining !== null
        ? daysRemaining >= 0
          ? `Valid until ${formattedExpiry} (${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining).`
          : `Expired on ${formattedExpiry}.`
        : "Active license. Duration is not currently available from the account data.",
    tone: "border-accent-green/20 bg-accent-green/10 text-accent-green",
  };
};

type AccountCardProps = {
  account: MT5Account;
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

export function AccountCard({
  account,
  masterOptions,
  selectedMasterIds,
  isTrialAccount,
  generatedKey,
  copiedValue,
  actionLoading,
  onCopy,
  onDelete,
  onGenerate,
  onRevoke,
  onMasterSelectionChange,
  onAssignMaster,
}: AccountCardProps) {
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const health = getHealthState(account);
  const HealthIcon = health.icon;
  const keyForThisAccount = generatedKey?.id === account.id ? generatedKey.key : null;
  const isMasterAccount = account.accountType === "MASTER";
  const eaTypeLabel = isMasterAccount ? "Sender EA" : "Receiver EA";
  const licenseValidity = getLicenseValidity(account as AccountWithLicense, eaTypeLabel);
  const mt5WebRequestUrl = "https://api.tesoy.online";
  const selectedMasterId =
    selectedMasterIds[account.id] ?? account.allowedMasterAccountId ?? "";
  const hasSavedMasterAssignment =
    !isMasterAccount &&
    Boolean(account.assignedMaster) &&
    Boolean(account.allowedMasterAccountId) &&
    selectedMasterId === account.allowedMasterAccountId;
  const isSavingAssignment = actionLoading === `assign-${account.id}`;
  const assignedMasterLabel = account.assignedMaster
    ? `${account.assignedMaster.broker || "Unknown broker"} ${account.assignedMaster.accountId}`
    : "None";
  const assignedMasterDetail = account.assignedMaster
    ? `${account.assignedMaster.broker || "Unknown broker"} / ${account.assignedMaster.accountId}`
    : "";
  const eaOnlineLabel = account.isConnected ? "Online" : "Offline";
  const compatibleMasterOptions = masterOptions.filter(
    (master) =>
      master.accountEnvironment === account.accountEnvironment &&
      (!isTrialAccount || master.accountEnvironment === "DEMO")
  );

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
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  account.accountType === "MASTER"
                    ? "bg-accent-purple/10 text-accent-purple"
                    : "bg-primary/10 text-primary"
                }`}
              >
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
            <p className="mt-1 text-xs text-foreground-subtle">EA heartbeat: {formatHeartbeat(account.lastHeartbeat)}</p>
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
              className="p-2 hover:bg-primary/10 rounded-lg text-foreground-muted hover:text-primary transition active:scale-95"
            >
              {actionLoading === account.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
            </button>
            {account.hasApiKey && (
              <button
                onClick={() => onRevoke(account)}
                aria-label="Revoke API key"
                disabled={actionLoading === account.id}
                className="p-2 hover:bg-accent-yellow/10 rounded-lg text-foreground-muted hover:text-accent-yellow transition active:scale-95"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => onDelete(account.id)}
              title="Delete Account"
              disabled={actionLoading === account.id}
              className="p-2 hover:bg-accent-red/10 rounded-lg text-foreground-muted hover:text-accent-red transition active:scale-95"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <DetailItem icon={Server} label="Server" value={account.server || "Not set"} />
        <DetailItem icon={Info} label="Broker" value={account.broker || "Not set"} />
        <DetailItem icon={Key} label="API key" value={account.hasApiKey ? "Generated" : "Not generated"} />
        <DetailItem icon={ShieldAlert} label="Environment" value={account.accountEnvironment === "LIVE" ? "Live" : "Demo"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {isMasterAccount ? (
          <>
            <DetailItem icon={Radio} label="Signal sending" value={account.allowSignalSend ? "Enabled" : "Disabled"} />
            <DetailItem icon={Laptop} label="Connected Sender EA" value={eaOnlineLabel} />
            <DetailItem icon={Users} label="Followers assigned" value={account.followersAssigned.toString()} />
          </>
        ) : (
          <>
            <DetailItem icon={Radio} label="Signal receiving" value={account.allowSignalReceive ? "Enabled" : "Disabled"} />
            <DetailItem icon={Users} label="Assigned Master" value={assignedMasterLabel} />
            <DetailItem icon={Laptop} label="Receiver EA" value={eaOnlineLabel} />
          </>
        )}
      </div>

      {!isMasterAccount && (
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold">Follow Master</p>
            <p className="mt-1 text-xs text-foreground-muted">
              Choose which Master account this Receiver should pull approved backend signals from.
            </p>
          </div>

          {account.assignedMaster ? (
            <p className="mb-3 text-sm text-foreground-muted">
              Current assignment:{" "}
              <span className="font-medium text-foreground">
                Following: {assignedMasterDetail}
              </span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {account.assignedMaster.accountEnvironment === "LIVE" ? "Live" : "Demo"}
              </span>
            </p>
          ) : (
            <p className="mb-3 text-sm text-foreground-muted">
              Current assignment: No Master assigned.
            </p>
          )}

          {compatibleMasterOptions.length === 0 ? (
            <div className="rounded-lg border border-accent-yellow/20 bg-accent-yellow/10 px-3 py-2 text-sm text-accent-yellow">
              No compatible Master account available. Trial users can only assign demo accounts.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <label htmlFor={`master-assignment-${account.id}`} className="mb-2 block text-sm font-medium">
                  Master account
                </label>
                <select
                  id={`master-assignment-${account.id}`}
                  value={selectedMasterId}
                  onChange={(event) => onMasterSelectionChange(account.id, event.target.value)}
                  className={`input ${hasSavedMasterAssignment ? "font-semibold text-primary" : ""}`}
                >
                  <option value="">Select a Master account</option>
                  {compatibleMasterOptions.map((master) => (
                    <option key={master.id} value={master.id} disabled={master.status !== "ACTIVE"}>
                      {master.broker || "Unknown broker"} / {master.accountId}
                      {` / ${master.accountEnvironment === "LIVE" ? "Live" : "Demo"}`}
                      {master.server ? ` / ${master.server}` : ""}
                      {master.status !== "ACTIVE" ? ` (${master.status})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onAssignMaster(account.id)}
                  disabled={isSavingAssignment || !selectedMasterId}
                  className="btn-primary flex h-11 w-full min-w-[10.5rem] items-center justify-center gap-2 px-4 lg:w-[10.5rem]"
                >
                  {isSavingAssignment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save assignment"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`rounded-xl border px-4 py-3 ${licenseValidity.tone}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-background/50">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">EA license validity</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-background/50 px-2 py-0.5 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {licenseValidity.label}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5">{licenseValidity.duration}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{eaTypeLabel} configuration</p>
            <p className="text-xs text-foreground-muted">
              Copy the backend URL into the EA. The EA builds the Cloud Protect endpoints automatically.
            </p>
          </div>
          {!account.hasApiKey && !keyForThisAccount && (
            <span className="rounded-lg bg-accent-yellow/10 px-2.5 py-1 text-xs text-accent-yellow">
              Generate a key first
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <CopyPill label="MT5 id" value={account.accountId} onCopy={onCopy} copiedValue={copiedValue} />
          <CopyPill label="Broker" value={account.broker || "Not set"} onCopy={onCopy} copiedValue={copiedValue} />
          <CopyPill label="Server" value={account.server || "Not set"} onCopy={onCopy} copiedValue={copiedValue} />
          <CopyPill label="Allow Web Request URL" value={mt5WebRequestUrl} onCopy={onCopy} copiedValue={copiedValue} />
        </div>
        <p className="mt-3 text-xs leading-5 text-foreground-muted">
          In MT5, add the same base URL under Tools → Options → Expert Advisors → Allow WebRequest for listed URL.
        </p>
      </div>

      {getHealthState(account).key === "NEVER" && (
        <div className="rounded-xl border border-accent-yellow/20 bg-accent-yellow/10 px-4 py-3 text-sm text-accent-yellow">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Next step: generate an API key, add this MT5 Login ID and server to your EA, then start MT5 AutoTrading to verify the connection.</span>
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
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-foreground-subtle transition hover:bg-background-elevated hover:text-foreground active:scale-95"
                    aria-label={showGeneratedKey ? "Hide API key" : "Reveal API key"}
                  >
                    {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onCopy(keyForThisAccount, "API key")}
                  aria-label={copiedValue === "API key" ? "API key copied" : "Copy API key"}
                  title={copiedValue === "API key" ? "Copied" : "Copy"}
                  className={`btn-secondary flex h-11 items-center justify-center gap-2 px-4 text-sm transition active:scale-95 ${
                    copiedValue === "API key"
                      ? "border-accent-green/60 bg-accent-green/10 text-accent-green"
                      : ""
                  }`}
                >
                  {copiedValue === "API key" ? (
                    <>
                      <ClipboardCheck className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
