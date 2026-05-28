import { z } from "zod";
import { strongPasswordSchema } from "../../utils/password-policy.js";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  phone: z.string().trim().max(20).optional(),
});

export const uploadAvatarSchema = z.object({
  image: z.string().trim().min(1, "Avatar image is required").max(750000),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPasswordSchema,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export const addMT5AccountSchema = z.object({
  accountId: z.string().trim().min(1, "Account ID is required").max(50),
  accountType: z.enum(["MASTER", "SLAVE"]),
  broker: z.string().trim().max(100).optional(),
  server: z.string().trim().min(1, "Server is required").max(100),
});
