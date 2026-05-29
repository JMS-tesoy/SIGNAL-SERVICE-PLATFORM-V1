"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  MT5AccountResponse,
  MT5PlanUsageResponse,
  userApi,
} from "@/lib/api";

type AccountType = "MASTER" | "SLAVE";

type GeneratedKeyState = {
  accountRecordId: string;
  key: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001";

export default function MT5AccountManager() {
  const [accounts, setAccounts] = useState<MT5AccountResponse[]>([]);
  const [planUsage, setPlanUsage] = useState<MT5PlanUsageResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyActionId, setKeyActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newAccountId, setNewAccountId] = useState("");
  const [newAccountType, setNewAccountType] = useState<AccountType>("SLAVE");
  const [newBroker, setNewBroker] = useState("");
  const [newServer, setNewServer] = useState("");

  const [generatedKey, setGeneratedKey] = useState<GeneratedKeyState | null>(
    null
  );

  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  };

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getToken();

    if (!token) {
      setAccounts([]);
      setPlanUsage(null);
      setError("You are not logged in. Please log in again.");
      setLoading(false);
      return;
    }

    const response = await userApi.getMT5Accounts(token);

    if (response.error || !response.data) {
      setAccounts([]);
      setPlanUsage(null);
      setError(response.error || "Could not load MT5 accounts.");
      setLoading(false);
      return;
    }

    setAccounts(response.data.accounts || []);
    setPlanUsage(response.data.planUsage || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAddAccount = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setGeneratedKey(null);
    setCopiedKeyId(null);

    const accountId = newAccountId.trim();
    const broker = newBroker.trim();
    const server = newServer.trim();

    if (!accountId) {
      setError("MT5 Login ID is required.");
      return;
    }

    if (!server) {
      setError("MT5 server is required.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError("You are not logged in. Please log in again.");
      return;
    }

    setSaving(true);

    const response = await userApi.addMT5Account(token, {
      accountId,
      accountType: newAccountType,
      broker: broker || undefined,
      server,
    });

    if (response.error) {
      setError(response.error);
      setSaving(false);
      return;
    }

    setNewAccountId("");
    setNewAccountType("SLAVE");
    setNewBroker("");
    setNewServer("");
    setMessage("MT5 account added successfully.");

    await fetchAccounts();
    setSaving(false);
  };

  const handleGenerateKey = async (accountRecordId: string) => {
    setError("");
    setMessage("");
    setGeneratedKey(null);
    setCopiedKeyId(null);
    setKeyActionId(accountRecordId);

    const token = getToken();

    if (!token) {
      setError("You are not logged in. Please log in again.");
      setKeyActionId(null);
      return;
    }

    const response = await userApi.generateMT5ApiKey(token, accountRecordId);

    if (response.error || !response.data?.apiKey) {
      setError(response.error || "Could not generate API key.");
      setKeyActionId(null);
      return;
    }

    setGeneratedKey({
      accountRecordId,
      key: response.data.apiKey,
    });

    setMessage(
      "API key generated. Copy it now because the raw key will not be shown again."
    );

    await fetchAccounts();
    setKeyActionId(null);
  };

  const handleRevokeKey = async (accountRecordId: string) => {
    setError("");
    setMessage("");
    setGeneratedKey(null);
    setCopiedKeyId(null);
    setKeyActionId(accountRecordId);

    const token = getToken();

    if (!token) {
      setError("You are not logged in. Please log in again.");
      setKeyActionId(null);
      return;
    }

    const response = await userApi.revokeMT5ApiKey(token, accountRecordId);

    if (response.error) {
      setError(response.error);
      setKeyActionId(null);
      return;
    }

    setMessage("API key revoked successfully.");

    await fetchAccounts();
    setKeyActionId(null);
  };

  const copyGeneratedKey = async (accountRecordId: string) => {
    if (!generatedKey?.key) return;

    try {
      await navigator.clipboard.writeText(generatedKey.key);

      setError("");
      setCopiedKeyId(accountRecordId);
      setMessage("API key copied.");

      window.setTimeout(() => {
        setCopiedKeyId((currentId) =>
          currentId === accountRecordId ? null : currentId
        );
      }, 1500);
    } catch {
      setError("Could not copy API key. Please copy it manually.");
    }
  };

  const getConnectionLabel = (account: MT5AccountResponse) => {
    if (account.isConnected) return "Connected";
    if (account.lastHeartbeat) return "Stale";
    return "Offline";
  };

  const getConnectionClasses = (account: MT5AccountResponse) => {
    if (account.isConnected) return "bg-green-900 text-green-200";
    if (account.lastHeartbeat) return "bg-yellow-900 text-yellow-200";
    return "bg-gray-700 text-gray-300";
  };

  const formatHeartbeat = (value: string | null) => {
    if (!value) return "Never connected";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString();
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-6 rounded border-l-4 border-red-500 bg-red-900/50 p-4 text-red-200">
          <p>{error}</p>
        </div>
      )}

      {message && (
        <div className="mb-6 rounded border-l-4 border-green-500 bg-green-900/40 p-4 text-green-200">
          <p>{message}</p>
        </div>
      )}

      {planUsage && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Slave Usage
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {planUsage.currentSlaveAccounts} / {planUsage.maxSlaveAccounts}
            </p>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Subscription
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {planUsage.subscriptionStatus || "No subscription"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Tier
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {planUsage.tierName || "No tier"}
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-sm">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
          Add New MT5 Connection
        </h3>

        <form onSubmit={handleAddAccount} className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-1">
            <label
              htmlFor="mt5-manager-login-id"
              className="mb-1 block text-xs text-gray-400"
            >
              MT5 Login ID
            </label>
            <input
              id="mt5-manager-login-id"
              name="accountId"
              aria-label="MT5 Login ID"
              type="text"
              value={newAccountId}
              onChange={(event) => setNewAccountId(event.target.value)}
              placeholder="e.g. 88812345"
              className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-white transition-colors focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="md:col-span-1">
            <label
              htmlFor="mt5-manager-account-type"
              className="mb-1 block text-xs text-gray-400"
            >
              Type
            </label>
            <select
              id="mt5-manager-account-type"
              name="accountType"
              value={newAccountType}
              onChange={(event) =>
                setNewAccountType(event.target.value as AccountType)
              }
              className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="SLAVE">Receiver / Slave</option>
              <option value="MASTER">Sender / Master</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label
              htmlFor="mt5-manager-broker"
              className="mb-1 block text-xs text-gray-400"
            >
              Broker Optional
            </label>
            <input
              id="mt5-manager-broker"
              name="broker"
              aria-label="Broker"
              type="text"
              value={newBroker}
              onChange={(event) => setNewBroker(event.target.value)}
              placeholder="e.g. IC Markets"
              className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-white transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-1">
            <label
              htmlFor="mt5-manager-server"
              className="mb-1 block text-xs text-gray-400"
            >
              Server Required
            </label>
            <input
              id="mt5-manager-server"
              name="server"
              aria-label="MT5 Server"
              type="text"
              value={newServer}
              onChange={(event) => setNewServer(event.target.value)}
              placeholder="e.g. ICMarketsSC-Demo"
              className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-white transition-colors focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-end md:col-span-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded bg-blue-600 px-6 py-2 font-medium text-white transition duration-200 hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Active Connections
        </h3>

        {loading && <p className="animate-pulse text-gray-500">Loading...</p>}

        {!loading &&
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        account.accountType === "MASTER"
                          ? "bg-purple-900 text-purple-200"
                          : "bg-green-900 text-green-200"
                      }`}
                    >
                      {account.accountType}
                    </span>

                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${getConnectionClasses(
                        account
                      )}`}
                    >
                      {getConnectionLabel(account)}
                    </span>

                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        account.hasApiKey
                          ? "bg-blue-900 text-blue-200"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {account.hasApiKey ? "API Key Active" : "No API Key"}
                    </span>
                  </div>

                  <div>
                    <p className="font-mono text-lg text-white">
                      {account.accountId}
                    </p>
                    <p className="text-sm text-gray-400">
                      Broker: {account.broker || "Not set"}
                    </p>
                    <p className="text-sm text-gray-400">
                      Server: {account.server || "Not set"}
                    </p>
                    <p className="text-sm text-gray-400">
                      Last heartbeat: {formatHeartbeat(account.lastHeartbeat)}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-gray-400 md:grid-cols-3">
                    <p>Balance: {account.balance ?? "N/A"}</p>
                    <p>Equity: {account.equity ?? "N/A"}</p>
                    <p>Profit: {account.profit ?? "N/A"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:min-w-44">
                  <button
                    type="button"
                    onClick={() => handleGenerateKey(account.id)}
                    disabled={keyActionId === account.id}
                    className="rounded border border-blue-500/50 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-950 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {account.hasApiKey ? "Regenerate Key" : "Generate Key"}
                  </button>

                  {account.hasApiKey && (
                    <button
                      type="button"
                      onClick={() => handleRevokeKey(account.id)}
                      disabled={keyActionId === account.id}
                      className="rounded border border-red-500/50 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Revoke Key
                    </button>
                  )}
                </div>
              </div>

              {generatedKey?.accountRecordId === account.id && (
                <div className="rounded border border-yellow-700 bg-yellow-900/30 p-4">
                  <p className="mb-2 text-xs font-bold text-yellow-500">
                    COPY THIS KEY NOW. It will not be shown again after you
                    leave or refresh this page.
                  </p>

                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      id={`mt5-generated-key-${account.id}`}
                      name="generatedApiKey"
                      aria-label="Generated MT5 API key"
                      readOnly
                      value={generatedKey.key}
                      className="flex-1 rounded border border-yellow-800 bg-black/50 p-2 font-mono text-sm text-yellow-200"
                      onClick={(event) => event.currentTarget.select()}
                    />

                    <button
                      type="button"
                      onClick={() => copyGeneratedKey(account.id)}
                      aria-label="Copy generated API key"
                      title={copiedKeyId === account.id ? "Copied" : "Copy"}
                      className={`rounded px-4 py-2 text-sm font-medium transition active:scale-95 ${
                        copiedKeyId === account.id
                          ? "bg-green-700 text-white"
                          : "bg-yellow-800 text-yellow-100 hover:bg-yellow-700"
                      }`}
                    >
                      {copiedKeyId === account.id ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`rounded border p-3 text-sm ${
                  account.accountType === "MASTER"
                    ? "border-blue-700/70 bg-blue-950/20 text-blue-100"
                    : "border-emerald-700/70 bg-emerald-950/20 text-emerald-100"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-100">
                    Cloud Protect EA Setup Values
                  </p>

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      account.accountType === "MASTER"
                        ? "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/40"
                        : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                    }`}
                  >
                    {account.accountType === "MASTER" ? "Sender EA" : "Receiver EA"}
                  </span>
                </div>

                <p
                  className={`mb-3 text-xs font-medium ${
                    account.accountType === "MASTER"
                      ? "text-blue-300"
                      : "text-emerald-300"
                  }`}
                >
                  {account.accountType === "MASTER"
                    ? "Sender EA setup — copy these values into your Sender EA."
                    : "Receiver EA setup — copy these values into your Receiver EA."}
                </p>

                <div className="space-y-1 text-gray-300">
                  <p>account_id: {account.accountId}</p>
                  <p>broker: {account.broker || "Not set"}</p>
                  <p>server: {account.server || "Not set"}</p>
                  <p>License Verify URL: {API_BASE_URL}/api/mt5/license/verify</p>
                  <p>Heartbeat URL: {API_BASE_URL}/api/mt5/heartbeat</p>

                  {account.accountType === "MASTER" ? (
                    <p>Signal Push URL: Not enabled yet</p>
                  ) : (
                    <>
                      <p>Signal Pull URL: {API_BASE_URL}/api/mt5/signals/pull</p>
                      <p>Trade Report URL: {API_BASE_URL}/api/mt5/trade/report</p>
                    </>
                  )}

                  <p>WebRequest Base URL: {API_BASE_URL}</p>
                  <p>Required Header: Authorization: Bearer &lt;API_KEY&gt;</p>
                </div>
              </div>

            </div>
          ))}

        {!loading && accounts.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/50 py-10 text-center">
            <p className="text-gray-500">No MT5 accounts linked yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}