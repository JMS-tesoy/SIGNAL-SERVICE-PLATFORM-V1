"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  LayoutDashboard,
  Signal,
  CreditCard,
  Settings,
  User,
  LogOut,
  Menu,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Shield,
  Download,
  Users,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore, useUIStore } from "@/lib/store";
import { userApi } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/signals", icon: Signal, label: "Signals" },
  { href: "/dashboard/accounts", icon: Laptop, label: "MT5 Accounts" },
  { href: "/dashboard/subscription", icon: CreditCard, label: "Subscription" },
  { href: "/dashboard/downloads", icon: Download, label: "Downloads" },
  { href: "/dashboard/security", icon: Shield, label: "Security" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const adminNavItems = [
  { href: "/dashboard/admin", icon: ShieldCheck, label: "Admin Overview" },
  { href: "/dashboard/admin/users", icon: Users, label: "Users" },
  { href: "/dashboard/admin/signals", icon: Signal, label: "All Signals" },
  { href: "/dashboard/admin/revenue", icon: DollarSign, label: "Revenue" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    logout,
    setUser,
    setLoading,
  } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const hydratedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const hydrateUser = async () => {
      if (isLoading) {
        return;
      }

      if (!accessToken) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      if (hydratedTokenRef.current === accessToken) {
        return;
      }

      hydratedTokenRef.current = accessToken;
      const result = await userApi.getProfile(accessToken);

      if (!isMounted) {
        return;
      }

      if (result.data?.user) {
        setUser(result.data.user);
      } else if (result.status === 429) {
        hydratedTokenRef.current = null;
        setLoading(false);
        return;
      } else {
        hydratedTokenRef.current = null;
        logout();
        const message = encodeURIComponent(
          result.error || "Session expired. Please sign in again.",
        );
        router.replace(`/login?error=${message}`);
      }

      setLoading(false);
    };

    hydrateUser();

    return () => {
      isMounted = false;
    };
  }, [accessToken, isLoading, logout, router, setLoading, setUser, user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !accessToken) {
      router.replace("/login");
    }
  }, [accessToken, isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-background-secondary border-r border-border z-40 transition-all duration-300 ${
          sidebarOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full lg:translate-x-0 lg:w-20"
        } lg:translate-x-0 ${sidebarOpen ? "lg:w-64" : "lg:w-20"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg font-bold text-gradient"
              >
                SignalService
              </motion.span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition hidden lg:flex items-center justify-center"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground-muted hover:bg-background-elevated hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary" : ""}`}
                />
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}

          {/* Admin Navigation */}
          {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
            <>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 mb-2 px-4"
                >
                  <span className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
                    Admin
                  </span>
                </motion.div>
              )}
              {!sidebarOpen && <div className="my-4 border-t border-border" />}
              {adminNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-accent-purple/10 text-accent-purple"
                        : "text-foreground-muted hover:bg-background-elevated hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-accent-purple" : ""}`}
                    />
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User section at bottom */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background-elevated">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.name || "Trader"}</p>
                <p className="text-xs text-foreground-muted truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        {/* Top bar */}
        <header className="h-14 sm:h-16 bg-background-secondary border-b border-border flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setUserMenuOpen(false);
                }}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                className="relative p-2 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition active:scale-95"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-border bg-background-elevated shadow-xl"
                  >
                    <div className="border-b border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">
                            Notifications
                          </p>
                          <p className="mt-1 text-sm text-foreground-muted">
                            MT5 account, signal, billing, and security updates.
                          </p>
                        </div>
                        <span className="rounded-full bg-accent-red/10 px-2 py-1 text-xs font-semibold text-accent-red">
                          4 new
                        </span>
                      </div>
                    </div>

                    <div className="max-h-[28rem] overflow-y-auto p-2">
                      <Link
                        href="/dashboard/accounts"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex gap-3 rounded-lg p-3 transition hover:bg-background-secondary"
                      >
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-red/10 text-accent-red">
                          <Laptop className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              MT5 receiver needs heartbeat
                            </p>
                            <span className="whitespace-nowrap text-[11px] text-foreground-muted">
                              now
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                            Check offline or stale slave accounts before they
                            miss signal execution.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/accounts"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex gap-3 rounded-lg p-3 transition hover:bg-background-secondary"
                      >
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              API key protection active
                            </p>
                            <span className="whitespace-nowrap text-[11px] text-foreground-muted">
                              today
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                            Raw keys are only shown once. Regenerate or revoke
                            keys from MT5 Accounts.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/signals"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex gap-3 rounded-lg p-3 transition hover:bg-background-secondary"
                      >
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
                          <Signal className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              Signal delivery monitoring
                            </p>
                            <span className="whitespace-nowrap text-[11px] text-foreground-muted">
                              live
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                            Watch recent master signals, follower execution
                            reports, and failed deliveries.
                          </p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/subscription"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex gap-3 rounded-lg p-3 transition hover:bg-background-secondary"
                      >
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              License access depends on subscription
                            </p>
                            <span className="whitespace-nowrap text-[11px] text-foreground-muted">
                              plan
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                            Expired plans should block follower copy access
                            until billing is restored.
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
                      <Link
                        href="/dashboard/security"
                        onClick={() => setNotificationsOpen(false)}
                        className="rounded-lg bg-background-secondary px-3 py-2 text-center text-xs font-medium text-foreground-muted transition hover:text-foreground"
                      >
                        Security Center
                      </Link>
                      <Link
                        href="/dashboard/accounts"
                        onClick={() => setNotificationsOpen(false)}
                        className="rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-white transition hover:opacity-90"
                      >
                        Check MT5 Accounts
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen((current) => !current);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-background-elevated transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-foreground-muted transition ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-background-elevated border border-border rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-3 border-b border-border">
                      <p className="font-medium">{user?.name || "Trader"}</p>
                      <p className="text-xs text-foreground-muted">
                        {user?.email}
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background-secondary text-foreground-muted hover:text-foreground transition"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setNotificationsOpen(false);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent-red/10 text-foreground-muted hover:text-accent-red transition"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 sm:p-6">{children}</main>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
