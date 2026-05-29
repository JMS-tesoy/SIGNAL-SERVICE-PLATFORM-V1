import { Activity, CheckCircle, Clock, XCircle } from "lucide-react";
import type { MT5Account } from "./types";

export function getHeartbeatAgeMinutes(lastHeartbeat: string | null) {
  if (!lastHeartbeat) return null;

  return Math.max(
    0,
    Math.round((Date.now() - new Date(lastHeartbeat).getTime()) / 1000 / 60)
  );
}

export function getHealthState(account: MT5Account) {
  const age = getHeartbeatAgeMinutes(account.lastHeartbeat);

  if (!account.lastHeartbeat) {
    return {
      key: "NEVER",
      label: "Pending EA connection",
      tone: "text-foreground-muted",
      bg: "bg-foreground-subtle/10",
      icon: XCircle,
    };
  }

  if (account.isConnected && age !== null && age <= 5) {
    return {
      key: "CONNECTED",
      label: "Connected",
      tone: "text-accent-green",
      bg: "bg-accent-green/10",
      icon: CheckCircle,
    };
  }

  if (age !== null && age <= 15) {
    return {
      key: "RECENT",
      label: "Recently active",
      tone: "text-primary",
      bg: "bg-primary/10",
      icon: Activity,
    };
  }

  return {
    key: "STALE",
    label: "Stale",
    tone: "text-accent-yellow",
    bg: "bg-accent-yellow/10",
    icon: Clock,
  };
}

export function formatHeartbeat(lastHeartbeat: string | null) {
  const age = getHeartbeatAgeMinutes(lastHeartbeat);

  if (age === null) return "Awaiting EA heartbeat";
  if (age < 1) return "Just now";
  if (age === 1) return "1 minute ago";
  if (age < 60) return `${age} minutes ago`;

  const hours = Math.floor(age / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

export function money(value: number | null) {
  if (value === null || Number.isNaN(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}
