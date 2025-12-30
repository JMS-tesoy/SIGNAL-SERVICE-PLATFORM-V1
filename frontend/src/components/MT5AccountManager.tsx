"use client";

import React, { useState, useEffect } from "react";

// --- CONFIGURATION ---
// This uses the snippet you provided.
// It checks the specific backend var, then the general API var, then defaults to localhost.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

// --- TYPES ---
interface MT5Account {
  id: string;
  accountId: string;
  accountType: "MASTER" | "SLAVE";
  apiKey?: string;
}

export default function MT5AccountManager() {
  // --- STATE ---
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form State
  const [newAccountId, setNewAccountId] = useState("");
  const [newAccountType, setNewAccountType] = useState("SLAVE");

  // Key Display State
  const [generatedKey, setGeneratedKey] = useState<{
    id: string;
    key: string;
  } | null>(null);

  // --- HELPERS ---
  const getAuthHeaders = () => {
    // Tries to get token from localStorage.
    // If you use cookies, this part might need adjustment, but usually fine for JWT.
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // --- API CALLS ---
  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/mt5-accounts`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load accounts");
      setAccounts(await res.json());
    } catch (err) {
      console.error(err);
      setError("Could not load accounts. Please ensure you are logged in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/mt5-accounts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          accountId: newAccountId,
          accountType: newAccountType,
        }),
      });

      if (!res.ok) throw new Error("Failed to add account");

      await fetchAccounts();
      setNewAccountId("");
    } catch (err) {
      setError("Error adding account. Ensure ID is unique.");
    }
  };

  const generateKey = async (uuid: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/user/mt5-accounts/${uuid}/api-key`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) throw new Error("Failed to generate key");

      const data = await res.json();
      setGeneratedKey({ id: uuid, key: data.apiKey });
    } catch (err) {
      setError("Could not generate API Key.");
    }
  };

  // --- RENDER (Dark Mode UI) ---
  return (
    <div className="w-full">
      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border-l-4 border-red-500 text-red-200 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Add Account Card */}
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg mb-8 shadow-sm">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">
          Add New Connection
        </h3>
        <form
          onSubmit={handleAddAccount}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          {/* Input: ID */}
          <div className="flex-1 w-full">
            <label className="block text-gray-400 text-xs mb-1">
              MT5 Login ID
            </label>
            <input
              type="text"
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              placeholder="e.g. 88812345"
              className="w-full bg-gray-900 border border-gray-600 text-white rounded p-2 focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Input: Type */}
          <div className="w-full md:w-48">
            <label className="block text-gray-400 text-xs mb-1">Type</label>
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 text-white rounded p-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="SLAVE">Receiver (Slave)</option>
              <option value="MASTER">Sender (Master)</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-medium transition duration-200"
          >
            Add Account
          </button>
        </form>
      </div>

      {/* Account List */}
      <div className="space-y-4">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">
          Active Connections
        </h3>

        {loading && <p className="text-gray-500 animate-pulse">Loading...</p>}

        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    acc.accountType === "MASTER"
                      ? "bg-purple-900 text-purple-200"
                      : "bg-green-900 text-green-200"
                  }`}
                >
                  {acc.accountType}
                </span>
                <span className="text-white font-mono text-lg">
                  {acc.accountId}
                </span>
              </div>

              <button
                onClick={() => generateKey(acc.id)}
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-medium"
              >
                Generate Key
              </button>
            </div>

            {/* Secret Key Display Area */}
            {generatedKey?.id === acc.id && (
              <div className="bg-yellow-900/30 border border-yellow-700 p-4 rounded animate-in fade-in slide-in-from-top-2">
                <p className="text-yellow-500 text-xs font-bold mb-2">
                  ⚠️ COPY KEY NOW - IT WILL NOT BE SHOWN AGAIN
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={generatedKey.key}
                    className="flex-1 bg-black/50 border border-yellow-800 text-yellow-200 font-mono text-sm p-2 rounded"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(generatedKey.key)
                    }
                    className="bg-yellow-800 hover:bg-yellow-700 text-yellow-100 px-4 rounded text-sm transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {!loading && accounts.length === 0 && (
          <div className="text-center py-10 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500">No accounts linked yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
