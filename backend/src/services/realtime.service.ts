import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import { authRepository } from "../database/repositories/index.js";
import { allowedOrigins } from "../config/cors.config.js";
import { env } from "../config/env.js";
import { verifyToken } from "./auth.service.js";

type DashboardRealtimeEvent = {
  type: "dashboard:trade-report" | "dashboard:refresh";
  signalId?: string;
  status?: string;
  action?: string;
  occurredAt: string;
};

type ReceiverSignalAvailableEvent = {
  signalId: string;
  executionId?: string;
  mt5AccountId: string;
  occurredAt: string;
};

let io: Server | null = null;
let receiverPublisher: Redis | null = null;
let receiverSubscriber: Redis | null = null;
const receiverWaiters = new Map<string, Set<() => void>>();

function userRoom(userId: string) {
  return `user:${userId}`;
}

function receiverChannel(mt5AccountId: string) {
  return `mt5-account:${mt5AccountId}:signal-available`;
}

function wakeReceiverWaiters(mt5AccountId: string) {
  const waiters = receiverWaiters.get(mt5AccountId);
  if (!waiters || waiters.size === 0) return;

  receiverWaiters.delete(mt5AccountId);

  for (const resolve of waiters) {
    resolve();
  }
}

export async function initializeRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  if (env.REDIS_URL) {
    const pubClient = new Redis(env.REDIS_URL, { lazyConnect: true });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    receiverPublisher = pubClient.duplicate();
    receiverSubscriber = pubClient.duplicate();

    await Promise.all([
      receiverPublisher.connect(),
      receiverSubscriber.connect(),
    ]);

    await receiverSubscriber.psubscribe("mt5-account:*:signal-available");
    receiverSubscriber.on("pmessage", (_pattern, channel) => {
      const match = channel.match(/^mt5-account:(.+):signal-available$/);
      if (match?.[1]) {
        wakeReceiverWaiters(match[1]);
      }
    });
  }

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string") {
      next(new Error("Authentication required"));
      return;
    }

    const payload = verifyToken(token);
    if (!payload || payload.type !== "access") {
      next(new Error("Invalid or expired token"));
      return;
    }

    const user = await authRepository.findAuthUserById(payload.userId);
    if (!user || user.status !== "ACTIVE") {
      next(new Error("Account is not active"));
      return;
    }

    socket.data.userId = user.id;
    socket.join(userRoom(user.id));
    next();
  });

  io.on("connection", (socket) => {
    socket.emit("dashboard:connected", {
      occurredAt: new Date().toISOString(),
    });
  });
}

export function emitDashboardRealtimeEvent(
  userId: string,
  event: DashboardRealtimeEvent
) {
  if (!io) return;

  io.to(userRoom(userId)).emit(event.type, event);
}

export async function waitForReceiverSignal(
  mt5AccountId: string,
  waitMs: number
) {
  if (waitMs <= 0) return;

  await new Promise<void>((resolve) => {
    let waiters = receiverWaiters.get(mt5AccountId);
    if (!waiters) {
      waiters = new Set();
      receiverWaiters.set(mt5AccountId, waiters);
    }

    let timeout: ReturnType<typeof setTimeout>;

    const resolveWait = () => {
      clearTimeout(timeout);
      resolve();
    };

    timeout = setTimeout(() => {
      waiters?.delete(resolveWait);
      if (waiters?.size === 0) {
        receiverWaiters.delete(mt5AccountId);
      }
      resolve();
    }, waitMs);

    waiters.add(resolveWait);
  });
}

export async function emitReceiverSignalAvailable(
  event: ReceiverSignalAvailableEvent
) {
  wakeReceiverWaiters(event.mt5AccountId);

  if (!receiverPublisher) return;

  try {
    await receiverPublisher.publish(receiverChannel(event.mt5AccountId), JSON.stringify({
      signalId: event.signalId,
      executionId: event.executionId,
      occurredAt: event.occurredAt,
    }));
  } catch (error) {
    console.error("Failed to publish receiver signal wake event:", error);
  }
}
