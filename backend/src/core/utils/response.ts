import { Response } from "express";
import { HTTP_STATUS, type HttpStatusCode } from "../constants/index.js";

type ResponseMeta = {
  requestId?: string;
};

export function sendSuccess<TData>(
  res: Response,
  data: TData,
  statusCode: HttpStatusCode = HTTP_STATUS.OK,
  meta: ResponseMeta = {}
) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...meta,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: unknown,
  meta: ResponseMeta = {}
) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(details ? { details } : {}),
    ...meta,
  });
}
