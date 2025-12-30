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
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { userApi } from "@/lib/api";

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
  const { accessToken } = useAuthStore();
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

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setActionLoading("add");
    setError("");

    try {
      const result = await userApi.addMT5Account(accessToken, {
        accountId: newAccount.accountId,
        accountType: newAccount.accountType,
        broker: newAccount.broker || undefined,
        server: newAccount.server || undefined,
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
                    className="input"
                    placeholder="e.g., 12345678"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account Type *
                  </label>
                  <select
                    value={newAccount.accountType}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        accountType: e.target.value as "MASTER" | "SLAVE",
                      })
                    }
                    className="input"
                  >
                    <option value="SLAVE">Slave (Signal Receiver)</option>
                    <option value="MASTER">Master (Signal Provider)</option>
                  </select>
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
                    className="input"
                    placeholder="e.g., IC Markets"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Server (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAccount.server}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, server: e.target.value })
                    }
                    className="input"
                    placeholder="e.g., ICMarkets-Demo"
                  />
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
                    disabled={actionLoading === "add"}
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
            <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg mt-2">
              <div className="flex items-start gap-2 text-yellow-500 mb-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <p className="text-xs font-bold">
                  COPY KEY NOW - IT WILL NOT BE SHOWN AGAIN
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  readOnly
                  value={generatedKey}
                  className="flex-1 bg-black/40 border border-yellow-800/50 text-yellow-200 font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-yellow-600"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(generatedKey)}
                  className="bg-yellow-800/50 hover:bg-yellow-700/50 text-yellow-100 px-4 rounded text-sm transition flex items-center gap-2 border border-yellow-700/50"
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
