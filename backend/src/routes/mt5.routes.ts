import { Router } from "express";
import {
  mt5HeartbeatSchema,
  mt5LicenseVerifySchema,
  mt5SignalsPullSchema,
  mt5TradeReportSchema,
} from "./schemas/mt5.schemas.js";
import {
  pullMt5Signals,
  recordMt5Heartbeat,
  reportMt5Trade,
  verifyMt5License,
} from "../services/mt5-cloud-protect.service.js";

const router = Router();

function getBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

router.post("/license/verify", async (req, res, next) => {
  try {
    const payload = mt5LicenseVerifySchema.parse(req.body);
    const apiKey = getBearerToken(req.headers.authorization);
    const result = await verifyMt5License(apiKey, payload);

    res.status(result.allowed ? 200 : 403).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/heartbeat", async (req, res, next) => {
  try {
    const payload = mt5HeartbeatSchema.parse(req.body);
    const apiKey = getBearerToken(req.headers.authorization);
    const result = await recordMt5Heartbeat(apiKey, payload);

    res.status(result.allowed ? 200 : 403).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/signals/pull", async (req, res, next) => {
  try {
    const payload = mt5SignalsPullSchema.parse(req.body);
    const apiKey = getBearerToken(req.headers.authorization);
    const result = await pullMt5Signals(apiKey, payload);

    res.status(result.allowed ? 200 : 403).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/trade/report", async (req, res, next) => {
  try {
    const payload = mt5TradeReportSchema.parse(req.body);
    const apiKey = getBearerToken(req.headers.authorization);
    const result = await reportMt5Trade(apiKey, payload);

    res.status(result.ok ? 200 : 403).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;