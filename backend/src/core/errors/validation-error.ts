import { HTTP_STATUS } from "../constants/index.js";
import { AppError } from "./app-error.js";

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, HTTP_STATUS.BAD_REQUEST, {
      code: "VALIDATION_ERROR",
      details,
    });
    this.name = "ValidationError";
  }
}
