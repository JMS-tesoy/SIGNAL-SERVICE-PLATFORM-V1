import type { MT5PlanUsageResponse } from "@/lib/api";

export type AccountFilter = "ALL" | "CONNECTED" | "OFFLINE" | "MASTER" | "SLAVE";
export type KeyAction = "generate" | "regenerate" | "revoke";
export type AccountType = "MASTER" | "SLAVE";
export type AccountEnvironment = "DEMO" | "LIVE";
export type MessageState = { type: "" | "success" | "error"; text: string };

export interface MT5Account {
  id: string;
  accountId: string;
  accountType: AccountType;
  accountEnvironment: AccountEnvironment;
  broker: string | null;
  server: string | null;
  status: string;
  isConnected: boolean;
  lastHeartbeat: string | null;
  hasApiKey?: boolean;
  allowedMasterAccountId: string | null;
  assignedMaster: {
    id: string;
    accountId: string;
    accountEnvironment: AccountEnvironment;
    broker: string | null;
    server: string | null;
    status: string;
  } | null;
  followersAssigned: number;
  allowSignalSend: boolean;
  allowSignalReceive: boolean;
  balance: number | null;
  equity: number | null;
  profit: number | null;
  floatingProfit?: number | null;
  realizedProfit?: number | null;
}

export type GeneratedKey = {
  id: string;
  key: string;
} | null;

export type NewAccountForm = {
  accountId: string;
  accountType: AccountType;
  accountEnvironment: AccountEnvironment;
  broker: string;
  server: string;
};

export type AccountValidation = {
  accountId: string;
  server: string;
  broker: string;
};

export type AccountPlanUsage = MT5PlanUsageResponse | null;
