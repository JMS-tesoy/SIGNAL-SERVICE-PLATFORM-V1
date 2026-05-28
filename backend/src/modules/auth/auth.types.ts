import type { User, TwoFactorMethod } from "@prisma/client";

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  rememberMe?: boolean;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: Partial<User>;
  accessToken?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: TwoFactorMethod;
  tempToken?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: "access" | "refresh" | "temp";
}
