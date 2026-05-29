'use client';

import { Loader2, LogOut, Monitor, Trash2 } from 'lucide-react';
import { SecuritySession } from '../types';
import { formatSessionDate, getSessionDeviceLabel } from '../utils';

type ActiveSessionsCardProps = {
  sessions: SecuritySession[];
  sessionsLoading: boolean;
  sessionActionId: string | null;
  onRevokeSession: (sessionId: string) => void;
  onRevokeAllSessions: () => void;
};

export function ActiveSessionsCard({
  sessions,
  sessionsLoading,
  sessionActionId,
  onRevokeSession,
  onRevokeAllSessions,
}: ActiveSessionsCardProps) {
  return (
    <div className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Active Sessions
        </h2>
        {sessions.some((session) => !session.isCurrent) && (
          <button
            type="button"
            onClick={onRevokeAllSessions}
            disabled={sessionActionId === 'all'}
            className="text-accent-red text-sm hover:underline disabled:opacity-50"
          >
            {sessionActionId === 'all' ? 'Revoking...' : 'Revoke all other sessions'}
          </button>
        )}
      </div>

      {sessionsLoading ? (
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-foreground-muted">No active sessions found.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-3 rounded-xl bg-background-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-background p-2 text-foreground-muted">
                  <Monitor className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">
                      {getSessionDeviceLabel(session.userAgent)}
                    </p>
                    {session.isCurrent && (
                      <span className="rounded bg-accent-green/10 px-2 py-0.5 text-xs text-accent-green">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-foreground-muted">
                    {session.ipAddress || 'Unknown IP'} • {formatSessionDate(session.createdAt)}
                  </p>
                  {session.userAgent && (
                    <p className="mt-1 truncate text-xs text-foreground-subtle">
                      {session.userAgent}
                    </p>
                  )}
                </div>
              </div>

              {!session.isCurrent && (
                <button
                  type="button"
                  onClick={() => onRevokeSession(session.id)}
                  disabled={sessionActionId === session.id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent-red/30 px-3 py-2 text-sm text-accent-red transition hover:bg-accent-red/10 disabled:opacity-50"
                >
                  {sessionActionId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
