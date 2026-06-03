import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

export type DashboardRealtimeEvent = {
  type: 'dashboard:trade-report' | 'dashboard:refresh';
  signalId?: string;
  status?: string;
  action?: string;
  occurredAt: string;
};

type DashboardRealtimeHandlers = {
  onDashboardRefresh: (event: DashboardRealtimeEvent) => void;
};

export function connectDashboardRealtime(
  accessToken: string,
  handlers: DashboardRealtimeHandlers,
): Socket {
  const socket = io(API_URL, {
    path: '/socket.io',
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('dashboard:trade-report', handlers.onDashboardRefresh);
  socket.on('dashboard:refresh', handlers.onDashboardRefresh);

  return socket;
}
