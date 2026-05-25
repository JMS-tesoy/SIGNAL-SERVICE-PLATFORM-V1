"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Key,
  Copy,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { subscriptionApi, userApi } from "@/lib/api";

// --- CONFIGURATION ---
// Tries to find the correct backend URL from your environment variables
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

interface MT5Account {
  id: string;
  accountId: string;
  accountType: "MASTER" | "SLAVE";
  broker: string | null;
  server: string | null;
  isConnected: boolean;
  lastHeartbeat: string | null;
  balance: number | null;
  equity: number | null;
  profit: number | null;
}

export default function AccountsPage() {
  const { accessToken, subscription, setSubscription } = useAuthStore();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New State for API Key Display
  const [generatedKey, setGeneratedKey] = useState<{
    id: string;
    key: string;
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
  const accountId = newAccount.accountId.trim();
  const broker = newAccount.broker.trim();
  const server = newAccount.server.trim();
  const accountIdIsNumeric = /^\d+$/.test(accountId);
  const duplicateAccount = accounts.some(
    (account) => account.accountId === accountId
  );
  const accountValidation = {
    accountId:
      !accountId
        ? "Account ID is required."
        : !accountIdIsNumeric
          ? "Account ID should contain numbers only."
          : accountId.length < 5
            ? "Account ID should be at least 5 digits."
            : accountId.length > 50
              ? "Account ID must be 50 digits or fewer."
              : duplicateAccount
                ? "This MT5 account is already connected."
                : "",
    server:
      !server
        ? "Server is required."
        : server.length < 3
          ? "Server should be at least 3 characters."
          : server.length > 100
            ? "Server must be 100 characters or fewer."
            : "",
    broker:
      broker.length > 100 ? "Broker must be 100 characters or fewer." : "",
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
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
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

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setActionLoading("add");
    setError("");

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

    if (isFreeAccount && newAccount.accountType === "MASTER") {
      setError("Master Signal Provider accounts require a paid plan.");
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
        setNewAccount({
          accountId: "",
          accountType: "SLAVE",
          broker: "",
          server: "",
        });
        fetchAccounts();
      }
    } catch (err) {
      setError("Failed to add account");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to remove this account?")) return;

    setActionLoading(accountId);

    try {
      const result = await userApi.deleteMT5Account(accessToken, accountId);
      if (!result.error) {
        setAccounts(accounts.filter((a) => a.id !== accountId));
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // --- UPDATED DEBUG FUNCTION: Generate API Key ---
  const handleGenerateKey = async (accountUuid: string) => {
    if (!accessToken) return;

    setGeneratedKey(null);
    setActionLoading(accountUuid);

    try {
      // DEBUG: Log the exact URL we are trying to hit
      const targetUrl = `${API_BASE_URL}/api/user/mt5-accounts/${accountUuid}/api-key`;
      console.log("Attempting request to:", targetUrl);

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // DEBUG: If it fails, capture the text response from the server
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Backend Error:", res.status, errorText);
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      setGeneratedKey({ id: accountUuid, key: data.apiKey });
    } catch (err: any) {
      console.error("Full Error Object:", err);
      // Alert the user with the specific error message
      alert(`Failed to generate key: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const masterAccounts = accounts.filter((a) => a.accountType === "MASTER");
  const slaveAccounts = accounts.filter((a) => a.accountType === "SLAVE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">MT5 Accounts</h1>
          <p className="text-foreground-muted">
            Manage your MetaTrader 5 connections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAccounts}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Connection Guide */}
      <div className="card bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Laptop className="w-5 h-5 text-primary" />
          How to Connect Your MT5
        </h3>
        <ol className="text-sm text-foreground-muted space-y-1 list-decimal list-inside">
          <li>Download the Signal Receiver EA from the downloads section</li>
          <li>Copy the EA to your MT5 Experts folder</li>
          <li>Attach the EA to any chart and enter your account credentials</li>
          <li>The EA will automatically connect and start receiving signals</li>
        </ol>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12">
          <Laptop className="w-16 h-16 mx-auto mb-4 text-foreground-subtle opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Accounts Connected</h3>
          <p className="text-foreground-muted mb-6">
            Add your first MT5 account to start receiving trading signals
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Master Accounts */}
          {masterAccounts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-purple" />
                Master Accounts (Signal Providers)
              </h2>
              <div className="grid gap-4">
                {masterAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onDelete={() => handleDeleteAccount(account.id)}
                    onGenerateKey={() => handleGenerateKey(account.id)}
                    generatedKey={
                      generatedKey?.id === account.id ? generatedKey.key : null
                    }
                    isActionLoading={actionLoading === account.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Slave Accounts */}
          {slaveAccounts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Slave Accounts (Signal Receivers)
              </h2>
              <div className="grid gap-4">
                {slaveAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onDelete={() => handleDeleteAccount(account.id)}
                    onGenerateKey={() => handleGenerateKey(account.id)}
                    generatedKey={
                      generatedKey?.id === account.id ? generatedKey.key : null
                    }
                    isActionLoading={actionLoading === account.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Account Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background-secondary rounded-xl p-6 w-full max-w-md border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add MT5 Account</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-background-elevated rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAccount} className="space-y-4">
                {error && (
                  <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account ID *
                  </label>
                  <input
                    type="text"
                    value={newAccount.accountId}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        accountId: e.target.value,
                      })
                    }
                    className={`input ${accountValidation.accountId ? "border-accent-red focus:border-accent-red focus:ring-accent-red" : ""}`}
                    placeholder="e.g., 12345678"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={50}
                    required
                  />
                  {accountValidation.accountId && (
                    <p className="mt-2 flex items-start gap-2 text-xs text-accent-red">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      {accountValidation.accountId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account Type *
                  </label>
                  <select
                    value={newAccount.accountType}
                    onChange={(e) => {
                      if (isFreeAccount && e.target.value === "MASTER") {
                        setError("Master Signal Provider accounts require a paid plan.");
                        return;
                      }

                      setNewAccount({
                        ...newAccount,
                        accountType: e.target.value as "MASTER" | "SLAVE",
                      });
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

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Broker (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAccount.broker}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, broker: e.target.value })
                    }
                    className={`input ${accountValidation.broker ? "border-accent-red focus:border-accent-red focus:ring-accent-red" : ""}`}
                    placeholder="e.g., IC Markets"
                    maxLength={100}
                  />
                  {accountValidation.broker && (
                    <p className="mt-2 flex items-start gap-2 text-xs text-accent-red">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      {accountValidation.broker}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Server *
                  </label>
                  <input
                    type="text"
                    value={newAccount.server}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, server: e.target.value })
                    }
                    className={`input ${accountValidation.server ? "border-accent-red focus:border-accent-red focus:ring-accent-red" : ""}`}
                    placeholder="e.g., ICMarkets-Demo"
                    autoComplete="off"
                    maxLength={100}
                    required
                  />
                  {accountValidation.server && (
                    <p className="mt-2 flex items-start gap-2 text-xs text-accent-red">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      {accountValidation.server}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === "add" || !addFormIsValid}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    {actionLoading === "add" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Add Account"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountCard({
  account,
  onDelete,
  onGenerateKey,
  generatedKey,
  isActionLoading,
}: {
  account: MT5Account;
  onDelete: () => void;
  onGenerateKey: () => void;
  generatedKey: string | null;
  isActionLoading: boolean;
}) {
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const timeSinceHeartbeat = account.lastHeartbeat
    ? Math.round(
        (Date.now() - new Date(account.lastHeartbeat).getTime()) / 1000 / 60
      )
    : null;

  return (
    <motion.div layout className="card flex flex-col gap-4">
      {/* Top Row: Info and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              account.isConnected
                ? "bg-accent-green/10"
                : "bg-foreground-subtle/10"
            }`}
          >
            <Laptop
              className={`w-6 h-6 ${
                account.isConnected
                  ? "text-accent-green"
                  : "text-foreground-subtle"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
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
            </div>
            <div className="text-sm text-foreground-muted">
              {account.broker || "Unknown broker"} •{" "}
              {account.server || "Unknown server"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Balance & Equity */}
          {account.balance !== null && (
            <div className="text-right hidden sm:block">
              <div className="font-mono">${account.balance.toFixed(2)}</div>
              <div
                className={`text-sm ${
                  (account.profit || 0) >= 0
                    ? "text-accent-green"
                    : "text-accent-red"
                }`}
              >
                {(account.profit || 0) >= 0 ? "+" : ""}
                {account.profit?.toFixed(2) || "0.00"}
              </div>
            </div>
          )}

          {/* Connection Status - FIXED HERE (Removed conflicting 'flex' class) */}
          <div className="hidden md:flex items-center gap-2">
            {account.isConnected ? (
              <>
                <CheckCircle className="w-5 h-5 text-accent-green" />
                <span className="text-sm text-accent-green">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-foreground-subtle" />
                <span className="text-sm text-foreground-muted">
                  {timeSinceHeartbeat !== null
                    ? `Offline ${timeSinceHeartbeat}m`
                    : "Never connected"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Generate Key Button */}
            <button
              onClick={onGenerateKey}
              title="Generate API Key"
              disabled={isActionLoading}
              className="p-2 hover:bg-primary/10 rounded-lg text-foreground-muted hover:text-primary transition"
            >
              <Key className="w-5 h-5" />
            </button>

            {/* Delete Button */}
            <button
              onClick={onDelete}
              title="Delete Account"
              disabled={isActionLoading}
              className="p-2 hover:bg-accent-red/10 rounded-lg text-foreground-muted hover:text-accent-red transition"
            >
              {isActionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: API Key Display (Conditional) */}
      <AnimatePresence>
        {generatedKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Key className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      API key generated
                    </p>
                    <p className="mt-1 text-xs leading-5 text-foreground-muted">
                      Copy it now. For security, this key will not be shown again after you leave this panel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    readOnly
                    type={showGeneratedKey ? "text" : "password"}
                    value={generatedKey}
                    className="input h-11 pr-12 font-mono text-sm"
                    onClick={(e) => e.currentTarget.select()}
                    aria-label="Generated MT5 API key"
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
                <button
                  onClick={() => navigator.clipboard.writeText(generatedKey)}
                  className="btn-secondary flex h-11 items-center justify-center gap-2 px-4 text-sm"
                >
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
