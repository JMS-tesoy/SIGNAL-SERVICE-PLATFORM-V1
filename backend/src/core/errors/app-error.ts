import { HTTP_STATUS, type HttpStatusCode } from "../constants/index.js";

export class AppError extends Error {
  statusCode: HttpStatusCode;
  isOperational: boolean;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    options: { code?: string; details?: unknown; isOperational?: boolean } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.code = options.code;
    this.details = options.details;

    Error.captureStackTrace(this, this.constructor);
  }
}
