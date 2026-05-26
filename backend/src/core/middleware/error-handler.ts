import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HTTP_STATUS } from "../constants/index.js";
import { AppError } from "../errors/index.js";
import { logger } from "../logging/index.js";

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error("Request failed", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.name === "PrismaClientKnownRequestError") {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: "Database operation failed",
    });
  }

  if (err instanceof ZodError || err.name === "ZodError") {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: "Validation failed",
      details: (err as ZodError).errors,
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: "Token expired",
    });
  }

  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: "Resource not found",
    path: req.path,
  });
}
