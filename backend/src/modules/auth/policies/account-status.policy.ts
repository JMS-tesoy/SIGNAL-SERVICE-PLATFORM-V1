import type { User } from "@prisma/client";

export function getInactiveAccountMessage(status: User["status"]): string | null {
  if (status === "PENDING_VERIFICATION") {
    return "Please verify your email before logging in.";
  }

  if (status === "SUSPENDED") {
    return "Your account has been suspended.";
  }

  if (status === "BANNED") {
    return "Your account has been banned.";
  }

  return null;
}
