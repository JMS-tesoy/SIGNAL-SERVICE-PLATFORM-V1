import { z } from "zod";

const accountIdSchema = z.string().trim().min(1).max(50);
const brokerSchema = z.string().trim().max(100).optional();
const serverSchema = z.string().trim().min(1).max(100);
const eaVersionSchema = z.string().trim().min(1).max(30);
const terminalFingerprintSchema = z.string().trim().min(8).max(255);
const optionalDeviceIdSchema = z.string().trim().max(255).optional();
const optionalTerminalIdSchema = z.string().trim().max(255).optional();

export const mt5LicenseVerifySchema = z.object({
  accountId: accountIdSchema,
  broker: brokerSchema,
  server: serverSchema,
  eaType: z.enum(["SENDER", "RECEIVER"]),
  eaVersion: eaVersionSchema,
  deviceId: optionalDeviceIdSchema,
  terminalId: optionalTerminalIdSchema,
  terminalFingerprint: terminalFingerprintSchema,
});

export const mt5HeartbeatSchema = z.object({
  sessionId: z.string().trim().min(1),
  accountId: accountIdSchema,
  broker: brokerSchema,
  server: serverSchema,
  eaVersion: eaVersionSchema,
  deviceId: optionalDeviceIdSchema,
  terminalId: optionalTerminalIdSchema,
  terminalFingerprint: terminalFingerprintSchema,
  balance: z.number().finite().optional(),
  equity: z.number().finite().optional(),
  profit: z.number().finite().optional(),
});

export const mt5SignalsPullSchema = z.object({
  sessionId: z.string().trim().min(1),
  accountId: accountIdSchema,
  broker: brokerSchema,
  server: serverSchema,
  eaVersion: eaVersionSchema,
  terminalFingerprint: terminalFingerprintSchema,
  lastSignalTimestamp: z.string().datetime().optional(),
});

export const mt5TradeReportSchema = z.object({
  sessionId: z.string().trim().min(1),
  signalId: z.string().trim().min(1),
  accountId: accountIdSchema,
  broker: brokerSchema,
  server: serverSchema,
  ticket: z.union([z.string().trim().min(1), z.number().int().positive()]).optional(),
  symbol: z.string().trim().min(1).max(30),
  orderType: z.enum(["BUY", "SELL"]),
  lotSize: z.number().positive(),
  openPrice: z.number().finite().optional().nullable(),
  closePrice: z.number().finite().optional().nullable(),
  sl: z.number().finite().optional().nullable(),
  tp: z.number().finite().optional().nullable(),
  profit: z.number().finite().optional().nullable(),
  status: z.enum(["OPENED", "MODIFIED", "CLOSED", "FAILED"]),
  errorCode: z.union([z.string(), z.number()]).optional().nullable(),
  errorMessage: z.string().max(500).optional().nullable(),
});

export type Mt5LicenseVerifyInput = z.infer<typeof mt5LicenseVerifySchema>;
export type Mt5HeartbeatInput = z.infer<typeof mt5HeartbeatSchema>;
export type Mt5SignalsPullInput = z.infer<typeof mt5SignalsPullSchema>;
export type Mt5TradeReportInput = z.infer<typeof mt5TradeReportSchema>;