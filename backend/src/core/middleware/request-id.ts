import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incomingRequestId = req.headers["x-request-id"];
  req.requestId =
    typeof incomingRequestId === "string" && incomingRequestId.trim()
      ? incomingRequestId
      : randomUUID();

  res.setHeader("x-request-id", req.requestId);
  next();
}
