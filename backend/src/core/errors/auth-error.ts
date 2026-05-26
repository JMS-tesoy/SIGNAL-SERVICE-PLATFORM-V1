import { HTTP_STATUS } from "../constants/index.js";
import { AppError } from "./app-error.js";

export class AuthError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, HTTP_STATUS.UNAUTHORIZED, {
      code: "AUTH_ERROR",
    });
    this.name = "AuthError";
  }
}
