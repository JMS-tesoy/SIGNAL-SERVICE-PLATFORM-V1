// =============================================================================
// API CLIENT - HTTP Request Utilities
// =============================================================================

import { useAuthStore } from './store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// =============================================================================
// TYPES
// =============================================================================

interface ApiOptions extends RequestInit {
  token?: string | null;
  skipAuthRefresh?: boolean;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

function getApiErrorMessage(data: unknown, status: number) {
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    const details = payload.details;

    if (Array.isArray(details)) {
      const firstMessage = details.find(
        (detail): detail is { message: string } =>
          Boolean(
            detail &&
              typeof detail === 'object' &&
              typeof (detail as Record<string, unknown>).message === 'string'
          )
      )?.message;

      if (firstMessage) {
        return firstMessage;
      }
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }
  }

  return `Request failed with status ${status}`;
}

// =============================================================================
// BASE FETCH WRAPPER
// =============================================================================

let refreshAccessTokenRequest: Promise<string | null> | null = null;

async function refreshStoredAccessToken() {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState();

  if (!refreshToken) {
    return null;
  }

  if (!refreshAccessTokenRequest) {
    refreshAccessTokenRequest = fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.accessToken) {
          logout();
          return null;
        }

        setAccessToken(data.accessToken);
        return data.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshAccessTokenRequest = null;
      });
  }

  return refreshAccessTokenRequest;
}

async function apiFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { token, skipAuthRefresh, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401 && token && !skipAuthRefresh) {
      const refreshedToken = await refreshStoredAccessToken();

      if (refreshedToken) {
        return apiFetch<T>(endpoint, {
          ...options,
          token: refreshedToken,
          skipAuthRefresh: true,
        });
      }
    }

    if (!response.ok) {
      return {
        error: getApiErrorMessage(data, response.status),
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: 'Network error. Please check your connection.',
      status: 0,
    };
  }
}

// =============================================================================
// AUTH API
// =============================================================================

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{
      accessToken?: string;
      refreshToken?: string;
      user?: any;
      requiresTwoFactor?: boolean;
      twoFactorMethod?: string;
      tempToken?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verify2FA: (tempToken: string, code: string, method: string) =>
    apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: any;
    }>('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code, method }),
    }),

  resend2FA: (tempToken: string) =>
    apiFetch<{ message: string; twoFactorMethod?: string }>('/api/auth/resend-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken }),
    }),

  refreshToken: (refreshToken: string) =>
    apiFetch<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (token: string) =>
    apiFetch('/api/auth/logout', {
      method: 'POST',
      token,
    }),

  forgotPassword: (email: string) =>
    apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  verifyEmail: (email: string, code: string) =>
    apiFetch('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resendVerification: (email: string) =>
    apiFetch('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  me: (token: string) =>
    apiFetch<{ user: any }>('/api/auth/me', { token }),
};

// =============================================================================
// OTP API
// =============================================================================

export const otpApi = {
  sendEmailOTP: (token: string, type: string) =>
    apiFetch('/api/otp/send/email', {
      method: 'POST',
      token,
      body: JSON.stringify({ type }),
    }),

  sendSMSOTP: (token: string, type: string, phone?: string) =>
    apiFetch('/api/otp/send/sms', {
      method: 'POST',
      token,
      body: JSON.stringify({ type, phone }),
    }),

  verify: (token: string, code: string, type: string) =>
    apiFetch('/api/otp/verify', {
      method: 'POST',
      token,
      body: JSON.stringify({ code, type }),
    }),

  setupTOTP: (token: string) =>
    apiFetch<{ secret: string; qrCode: string; manualEntryKey: string }>(
      '/api/otp/totp/setup',
      { method: 'POST', token }
    ),

  enableTOTP: (token: string, code: string) =>
    apiFetch<{ backupCodes: string[] }>('/api/otp/totp/enable', {
      method: 'POST',
      token,
      body: JSON.stringify({ code }),
    }),

  disableTOTP: (token: string, password: string) =>
    apiFetch('/api/otp/totp/disable', {
      method: 'POST',
      token,
      body: JSON.stringify({ password }),
    }),

  getStatus: (token: string) =>
    apiFetch<{
      twoFactorEnabled: boolean;
      twoFactorMethod: string;
      emailVerified: boolean;
    }>('/api/otp/status', { token }),
};

// =============================================================================
// SUBSCRIPTION API
// =============================================================================

export interface PlanCapabilities {
  canAddMasterAccount: boolean;
  canAddSlaveAccount: boolean;
  canUseDemoAccounts: boolean;
  canUseLiveAccounts: boolean;
  maxSlaveAccounts: number;
  maxSignalsPerDay: number;
  signalDelay: number;
}

export interface SubscriptionTierResponse {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  maxSignalsPerDay: number;
  maxSlaveAccounts: number;
  signalDelay: number;
  capabilities: PlanCapabilities;
  isPopular: boolean;
}

export interface CurrentSubscriptionResponse {
  id: string;
  status: string;
  tier: SubscriptionTierResponse;
  capabilities: PlanCapabilities;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export const subscriptionApi = {
  getTiers: () =>
    apiFetch<{ tiers: SubscriptionTierResponse[] }>('/api/subscriptions/tiers'),

  getCurrent: (token: string) =>
    apiFetch<{ subscription: CurrentSubscriptionResponse | null }>('/api/subscriptions/current', { token }),

  createCheckout: (token: string, tierId: string, billingCycle: string) =>
    apiFetch<{ url: string }>('/api/subscriptions/checkout', {
      method: 'POST',
      token,
      body: JSON.stringify({ tierId, billingCycle }),
    }),

  cancel: (token: string, immediately?: boolean) =>
    apiFetch('/api/subscriptions/cancel', {
      method: 'POST',
      token,
      body: JSON.stringify({ immediately }),
    }),

  resume: (token: string) =>
    apiFetch('/api/subscriptions/resume', {
      method: 'POST',
      token,
    }),

  changeTier: (token: string, tierId: string, billingCycle?: string) =>
    apiFetch('/api/subscriptions/change-tier', {
      method: 'POST',
      token,
      body: JSON.stringify({ tierId, billingCycle }),
    }),

  getPayments: (token: string, limit?: number) =>
    apiFetch<{ payments: any[] }>(
      `/api/subscriptions/payments${limit ? `?limit=${limit}` : ''}`,
      { token }
    ),

  getBillingPortal: (token: string) =>
    apiFetch<{ url: string }>('/api/subscriptions/billing-portal', { token }),

  getSignalLimit: (token: string) =>
    apiFetch<{ allowed: boolean; remaining: number; limit: number }>(
      '/api/subscriptions/signal-limit',
      { token }
    ),
};

// =============================================================================
// SIGNAL API
// =============================================================================

export interface SignalExecutionResponse {
  status: string;
  executedAt: string | null;
  executedPrice: number | null;
  closePrice?: number | null;
  profit?: number | null;
  pnl?: number | null;
  errorCode?: number | null;
  errorMessage?: string | null;
}

export interface SignalHistoryResponse {
  id: string;
  action: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  sl: number | null;
  tp: number | null;
  status: string;
  createdAt: string;
  execution: SignalExecutionResponse | null;
}

export interface SignalStatsResponse {
  totalSignals: number;
  executed: number;
  failed: number;
  skipped: number;
  expired: number;
  canceled: number;
  pending: number;
  bySymbol: Record<string, number>;
  byAction: { OPEN: number; CLOSE: number; MODIFY: number };
}

export const signalApi = {
  getHistory: (
    token: string,
    params?: {
      limit?: number;
      offset?: number;
      symbol?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      action?: string;
      type?: string;
    }
  ) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.symbol) query.set('symbol', params.symbol);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.status) query.set('status', params.status);
    if (params?.action) query.set('action', params.action);
    if (params?.type) query.set('type', params.type);
    
    return apiFetch<{
      signals: SignalHistoryResponse[];
      total: number;
      limit: number;
      offset: number;
    }>(
      `/api/signals/history?${query.toString()}`,
      { token }
    );
  },

  getStats: (token: string, period?: string) =>
    apiFetch<SignalStatsResponse>(
      `/api/signals/stats${period ? `?period=${period}` : ''}`,
      { token }
    ),

  getPerformance: (
    token: string,
    period?: '7D' | '30D' | '90D',
    granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ) =>
    apiFetch<{
      data: { date: string; growth: number; drawdown: number }[];
      period: string;
      granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
      source?: 'ACCOUNT_SNAPSHOT' | 'SIGNAL_EXECUTION';
      message?: string;
    }>(
      `/api/signals/performance?${new URLSearchParams({
        ...(period ? { period } : {}),
        ...(granularity ? { granularity } : {}),
      }).toString()}`,
      { token }
    ),
};

// =============================================================================
// USER API
// =============================================================================

export interface MT5AccountResponse {
  id: string;
  accountId: string;
  accountType: 'MASTER' | 'SLAVE';
  accountEnvironment: 'DEMO' | 'LIVE';
  broker: string | null;
  server: string | null;
  status: string;
  isConnected: boolean;
  lastHeartbeat: string | null;
  hasApiKey: boolean;
  allowedMasterAccountId: string | null;
  assignedMaster: {
    id: string;
    accountId: string;
    accountEnvironment: 'DEMO' | 'LIVE';
    broker: string | null;
    server: string | null;
    status: string;
  } | null;
  followersAssigned: number;
  allowSignalSend: boolean;
  allowSignalReceive: boolean;
  balance: number | null;
  equity: number | null;
  profit: number | null;
}

export interface MT5PlanUsageResponse {
  currentSlaveAccounts: number;
  maxSlaveAccounts: number;
  subscriptionStatus: string | null;
  tierName: string | null;
}

export const userApi = {
  getProfile: (token: string) =>
    apiFetch<{ user: any }>('/api/users/profile', { token }),

  updateProfile: (token: string, data: { name?: string; phone?: string }) =>
    apiFetch<{ user: any; message: string }>('/api/users/profile', {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  uploadAvatar: (token: string, image: string) =>
    apiFetch<{ user: any; avatar: string; message: string }>('/api/users/profile/avatar', {
      method: 'POST',
      token,
      body: JSON.stringify({ image }),
    }),

  removeAvatar: (token: string) =>
    apiFetch<{ user: any; message: string }>('/api/users/profile/avatar', {
      method: 'DELETE',
      token,
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiFetch('/api/users/password', {
      method: 'PUT',
      token,
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getMT5Accounts: (token: string) =>
    apiFetch<{ accounts: MT5AccountResponse[]; planUsage: MT5PlanUsageResponse }>(
      '/api/users/mt5-accounts',
      { token }
    ),

  addMT5Account: (token: string, data: {
    accountId: string;
    accountType: 'MASTER' | 'SLAVE';
    accountEnvironment: 'DEMO' | 'LIVE';
    broker?: string;
    server: string;
  }) =>
    apiFetch('/api/users/mt5-accounts', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  deleteMT5Account: (token: string, accountId: string) =>
    apiFetch(`/api/users/mt5-accounts/${accountId}`, {
      method: 'DELETE',
      token,
    }),

  generateMT5ApiKey: (token: string, accountId: string) =>
    apiFetch<{ apiKey: string; message: string }>(
      `/api/users/mt5-accounts/${accountId}/api-key`,
      {
        method: 'POST',
        token,
      }
    ),

  revokeMT5ApiKey: (token: string, accountId: string) =>
    apiFetch<{ message: string }>(
      `/api/users/mt5-accounts/${accountId}/api-key`,
      {
        method: 'DELETE',
        token,
      }
    ),

  assignMT5ReceiverMaster: (
    token: string,
    receiverId: string,
    masterAccountId: string
  ) =>
    apiFetch<{
      account: MT5AccountResponse;
      assignedMaster: MT5AccountResponse['assignedMaster'];
      message: string;
    }>(`/api/users/mt5-accounts/${receiverId}/assign-master`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ masterAccountId }),
    }),

  getSessions: (token: string) =>
    apiFetch<{ sessions: any[] }>('/api/users/sessions', { token }),

  revokeSession: (token: string, sessionId: string) =>
    apiFetch(`/api/users/sessions/${sessionId}`, {
      method: 'DELETE',
      token,
    }),

  revokeAllSessions: (token: string) =>
    apiFetch('/api/users/sessions', {
      method: 'DELETE',
      token,
    }),
};

// =============================================================================
// SECURITY API - Email Verification, 2FA, Sessions
// =============================================================================

export const securityApi = {
  // Email Verification
  sendEmailVerification: (token: string) =>
    apiFetch('/api/security/email/send-verification', {
      method: 'POST',
      token,
    }),

  verifyEmail: (token: string, code: string) =>
    apiFetch('/api/security/email/verify', {
      method: 'POST',
      token,
      body: JSON.stringify({ code }),
    }),

  getEmailStatus: (token: string) =>
    apiFetch<{ verified: boolean; verifiedAt: string | null }>(
      '/api/security/email/status',
      { token }
    ),

  // Two-Factor Authentication
  get2FAStatus: (token: string) =>
    apiFetch<{ enabled: boolean; method: string | null }>(
      '/api/security/2fa/status',
      { token }
    ),

  setupTOTP: (token: string) =>
    apiFetch<{ qrCode: string; manualEntryKey: string; secret: string }>(
      '/api/security/2fa/setup-totp',
      { method: 'POST', token }
    ),

  enableTOTP: (token: string, code: string) =>
    apiFetch<{ message: string; backupCodes: string[] }>(
      '/api/security/2fa/enable-totp',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ code }),
      }
    ),

  enableEmail2FA: (token: string) =>
    apiFetch('/api/security/2fa/enable-email', {
      method: 'POST',
      token,
    }),

  disable2FA: (token: string, password: string) =>
    apiFetch('/api/security/2fa/disable', {
      method: 'POST',
      token,
      body: JSON.stringify({ password }),
    }),

  // Session Management
  getSessions: (token: string) =>
    apiFetch<{ sessions: any[] }>('/api/security/sessions', { token }),

  revokeSession: (token: string, sessionId: string) =>
    apiFetch(`/api/security/sessions/${sessionId}`, {
      method: 'DELETE',
      token,
    }),

  revokeAllSessions: (token: string) =>
    apiFetch<{ message: string; revokedCount: number }>(
      '/api/security/sessions/revoke-all',
      {
        method: 'POST',
        token,
      }
    ),

  // Security Activity
  getActivity: (token: string) =>
    apiFetch<{
      lastLogin: { at: string | null; ip: string | null };
      emailVerified: boolean;
      twoFactorEnabled: boolean;
      recentSessions: any[];
    }>('/api/security/activity', { token }),
};

// =============================================================================
// DOWNLOAD API
// =============================================================================

export interface DownloadFile {
  id: string;
  name: string;
  description: string;
  filename: string;
}

export const downloadApi = {
  getAvailableDownloads: (token: string) =>
    apiFetch<{ downloads: DownloadFile[] }>('/api/downloads', { token }),

  getDownloadUrl: (fileId: string) => `${API_URL}/api/downloads/${fileId}`,
};

// =============================================================================
// ADMIN API - Admin-only endpoints
// =============================================================================

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalSignals: number;
  todaySignals: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  subscription?: {
    tier: { name: string; displayName: string };
    status: string;
  };
  _count?: {
    signals: number;
    mt5Accounts: number;
  };
}

export interface AdminSignal {
  id: string;
  symbol: string;
  type: string;
  action: string;
  volume: number;
  price: number;
  status: string;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    executions: number;
  };
}

export const adminApi = {
  // Dashboard Stats
  getStats: (token: string) =>
    apiFetch<AdminStats>('/api/admin/stats', { token }),

  // User Management
  getUsers: (token: string, params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);

    return apiFetch<{ users: AdminUser[]; total: number; page: number; pages: number }>(
      `/api/admin/users?${query.toString()}`,
      { token }
    );
  },

  getUserDetails: (token: string, userId: string) =>
    apiFetch<{ user: AdminUser & { signals: any[]; payments: any[] } }>(
      `/api/admin/users/${userId}`,
      { token }
    ),

  updateUserStatus: (token: string, userId: string, status: string) =>
    apiFetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    }),

  updateUserRole: (token: string, userId: string, role: string) =>
    apiFetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ role }),
    }),

  // Signal Management
  getSignals: (token: string, params?: { page?: number; limit?: number; symbol?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.symbol) query.set('symbol', params.symbol);
    if (params?.status) query.set('status', params.status);

    return apiFetch<{ signals: AdminSignal[]; total: number; page: number; pages: number }>(
      `/api/admin/signals?${query.toString()}`,
      { token }
    );
  },

  // Revenue & Analytics
  getRevenue: (token: string, months?: number) =>
    apiFetch<{
      monthlyRevenue: Record<string, number>;
      total: number;
      byTier: Record<string, number>;
    }>(
      `/api/admin/revenue${months ? `?months=${months}` : ''}`,
      { token }
    ),

  // Subscription Tiers Management
  getTiers: (token: string) =>
    apiFetch<{ tiers: any[] }>('/api/admin/tiers', { token }),

  createTier: (token: string, data: any) =>
    apiFetch('/api/admin/tiers', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),

  updateTier: (token: string, tierId: string, data: any) =>
    apiFetch(`/api/admin/tiers/${tierId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),
};

export default {
  auth: authApi,
  otp: otpApi,
  subscription: subscriptionApi,
  signal: signalApi,
  user: userApi,
  security: securityApi,
  download: downloadApi,
  admin: adminApi,
};
