import { unlink } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

export const AVATAR_BUCKET_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "avatars"
);

const MAX_OPTIMIZED_AVATAR_BYTES = 512 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getAvatarExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

function hasValidImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }

  return (
    mimeType === "image/webp" &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function parseAvatarDataUrl(dataUrl: string) {
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
  );

  if (!match) {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  const [, mimeType, base64Data] = match;

  if (!ALLOWED_AVATAR_MIME_TYPES.has(mimeType)) {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  const buffer = Buffer.from(base64Data, "base64");

  if (!buffer.length || buffer.length > MAX_OPTIMIZED_AVATAR_BYTES) {
    throw new Error("The optimized avatar is too large to save.");
  }

  if (!hasValidImageSignature(buffer, mimeType)) {
    throw new Error(
      "That image appears to be corrupted. Please choose another photo."
    );
  }

  return { buffer, extension: getAvatarExtension(mimeType) };
}

export async function removeStoredAvatar(avatar?: string | null) {
  if (!avatar) return;

  try {
    const avatarUrl = new URL(avatar, env.API_URL);
    const normalizedPath = avatarUrl.pathname.replace(/\\/g, "/");

    if (!normalizedPath.startsWith("/uploads/avatars/")) {
      return;
    }

    const fileName = path.basename(normalizedPath);
    await unlink(path.join(AVATAR_BUCKET_DIR, fileName));
  } catch {
    // Avatar cleanup is best-effort. The database update should not fail if a
    // previous local file is already gone or the value points to external storage.
  }
}
