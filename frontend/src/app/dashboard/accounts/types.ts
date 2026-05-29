import type { MT5PlanUsageResponse } from "@/lib/api";

export type AccountFilter = "ALL" | "CONNECTED" | "OFFLINE" | "MASTER" | "SLAVE";
export type KeyAction = "generate" | "regenerate" | "revoke";
export type AccountType = "MASTER" | "SLAVE";
export type MessageState = { type: "" | "success" | "error"; text: string };

export interface MT5Account {
  id: string;
  accountId: string;
  accountType: AccountType;
  broker: string | null;
  server: string | null;
  isConnected: boolean;
  lastHeartbeat: string | null;
  hasApiKey?: boolean;
  balance: number | null;
  equity: number | null;
  profit: number | null;
}

export type GeneratedKey = {
  id: string;
  key: string;
} | null;

export type NewAccountForm = {
  accountId: string;
  accountType: AccountType;
  broker: string;
  server: string;
};

export type AccountValidation = {
  accountId: string;
  server: string;
  broker: string;
};

export type AccountPlanUsage = MT5PlanUsageResponse | null;
