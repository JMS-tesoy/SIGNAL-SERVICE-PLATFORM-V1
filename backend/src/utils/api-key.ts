import crypto from "crypto";

const HASH_PREFIX = "sha256:";

export function generateMt5ApiKey(): string {
  return `mt5_${crypto.randomBytes(32).toString("hex")}`;
}

export function hashMt5ApiKey(apiKey: string): string {
  return `${HASH_PREFIX}${crypto.createHash("sha256").update(apiKey).digest("hex")}`;
}

export function isHashedMt5ApiKey(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(HASH_PREFIX));
}
