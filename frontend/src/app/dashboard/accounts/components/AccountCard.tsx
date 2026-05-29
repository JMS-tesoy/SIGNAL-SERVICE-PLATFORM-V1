import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Laptop,
  Loader2,
  Server,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { API_BASE_URL } from "../constants";
import type { GeneratedKey, MT5Account } from "../types";
import { formatHeartbeat, getHealthState, money } from "../utils";
import { CopyPill } from "./CopyPill";
import { DetailItem } from "./DetailItem";

type AccountCardProps = {
  account: MT5Account;
  generatedKey: GeneratedKey;
  copiedValue: string;
  actionLoading: string | null;
  onCopy: (value: string, label: string) => void;
  onDelete: (accountId: string) => void;
  onGenerate: (account: MT5Account) => void;
  onRevoke: (account: MT5Account) => void;
};

export function AccountCard({
  account,
  generatedKey,
  copiedValue,
  actionLoading,
  onCopy,
  onDelete,
  onGenerate,
  onRevoke,
}: AccountCardProps) {
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
                title="Revoke API Key"
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
          <CopyPill
            label={account.accountType === "MASTER" ? "Signals URL" : "Pending URL"}
            value={account.accountType === "MASTER" ? configEndpoint : pendingEndpoint}
            onCopy={onCopy}
            copiedValue={copiedValue}
          />
          <CopyPill label="WebRequest URL" value={API_BASE_URL} onCopy={onCopy} copiedValue={copiedValue} />
        </div>
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
