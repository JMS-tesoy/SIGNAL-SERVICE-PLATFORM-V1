import { Request, Response } from "express";

type DashboardRealtimeEvent = {
  type: "dashboard:trade-report" | "dashboard:refresh";
  signalId?: string;
  status?: string;
  action?: string;
  occurredAt: string;
};

const dashboardClients = new Map<string, Set<Response>>();

function writeRealtimeEvent(res: Response, event: DashboardRealtimeEvent) {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function subscribeDashboardRealtime(
  userId: string,
  req: Request,
  res: Response
) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.flushHeaders?.();

  let clients = dashboardClients.get(userId);
  if (!clients) {
    clients = new Set();
    dashboardClients.set(userId, clients);
  }

  clients.add(res);

  res.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients?.delete(res);

    if (clients?.size === 0) {
      dashboardClients.delete(userId);
    }
  });
}

export function emitDashboardRealtimeEvent(
  userId: string,
  event: DashboardRealtimeEvent
) {
  const clients = dashboardClients.get(userId);
  if (!clients || clients.size === 0) return;

  for (const client of clients) {
    writeRealtimeEvent(client, event);
  }
}
