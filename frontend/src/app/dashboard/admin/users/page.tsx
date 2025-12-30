'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  MoreVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Mail,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { adminApi, AdminUser } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-accent-green/10 text-accent-green',
  SUSPENDED: 'bg-accent-yellow/10 text-accent-yellow',
  BANNED: 'bg-accent-red/10 text-accent-red',
  PENDING_VERIFICATION: 'bg-foreground-subtle/10 text-foreground-subtle',
};

const ROLE_COLORS: Record<string, string> = {
  USER: 'bg-foreground-subtle/10 text-foreground-subtle',
  PROVIDER: 'bg-primary/10 text-primary',
  ADMIN: 'bg-accent-purple/10 text-accent-purple',
  SUPER_ADMIN: 'bg-accent-red/10 text-accent-red',
};

function UserRow({
  user,
  onStatusChange,
}: {
  user: AdminUser;
  onStatusChange: (userId: string, status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-border hover:bg-background-elevated/50 transition-colors"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-white font-semibold">
            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{user.name || 'No name'}</p>
            <p className="text-sm text-foreground-muted">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[user.status]}`}>
          {user.status}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[user.role]}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-4">
        {user.subscription ? (
          <span className="text-sm">{user.subscription.tier.displayName}</span>
        ) : (
          <span className="text-sm text-foreground-muted">No subscription</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {user.emailVerified ? (
            <Mail className="w-4 h-4 text-accent-green" />
          ) : (
            <Mail className="w-4 h-4 text-foreground-subtle" />
          )}
          {user.twoFactorEnabled ? (
            <ShieldCheck className="w-4 h-4 text-accent-green" />
          ) : (
            <Shield className="w-4 h-4 text-foreground-subtle" />
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-foreground-muted">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-4">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-background-elevated transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 bg-background-elevated border border-border rounded-xl shadow-xl z-20 overflow-hidden"
                >
                  <div className="p-1">
                    {user.status !== 'ACTIVE' && (
                      <button
                        onClick={() => {
                          onStatusChange(user.id, 'ACTIVE');
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent-green/10 text-accent-green transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Activate
                      </button>
                    )}
                    {user.status !== 'SUSPENDED' && (
                      <button
                        onClick={() => {
                          onStatusChange(user.id, 'SUSPENDED');
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent-yellow/10 text-accent-yellow transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Suspend
                      </button>
                    )}
                    {user.status !== 'BANNED' && (
                      <button
                        onClick={() => {
                          onStatusChange(user.id, 'BANNED');
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent-red/10 text-accent-red transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Ban
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </td>
    </motion.tr>
  );
}

export default function AdminUsersPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const result = await adminApi.getUsers(accessToken, {
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });

      if (result.data) {
        setUsers(result.data.users);
        setTotal(result.data.total);
        setPages(result.data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async (userId: string, status: string) => {
    if (!accessToken) return;

    try {
      await adminApi.updateUserStatus(accessToken, userId, status);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Users</h1>
          <p className="text-foreground-muted">
            Manage platform users ({total} total)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-12"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-foreground-muted" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
              <option value="PENDING_VERIFICATION">Pending</option>
            </select>
            {(search || statusFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setPage(1);
                }}
                className="p-2 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-background-elevated border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-sm">User</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Subscription</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Security</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Joined</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-12 skeleton rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onStatusChange={handleStatusChange}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-foreground-muted">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-foreground-muted">
              Page {page} of {pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
