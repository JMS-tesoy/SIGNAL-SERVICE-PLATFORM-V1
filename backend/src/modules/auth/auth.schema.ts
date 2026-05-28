import { z } from "zod";
import { strongPasswordSchema } from "../../utils/password-policy.js";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: strongPasswordSchema,
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const twoFactorSchema = z.object({
  tempToken: z.string(),
  code: z.string().length(6, "Code must be 6 digits"),
  method: z.enum(["EMAIL", "SMS", "TOTP"]),
  rememberMe: z.boolean().optional().default(false),
});

export const resendTwoFactorSchema = z.object({
  tempToken: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: strongPasswordSchema,
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
});
