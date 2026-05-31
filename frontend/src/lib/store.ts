// =============================================================================
// AUTH STORE - Zustand State Management
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  avatar?: string;
}

export interface Subscription {
  id: string;
  status: string;
  tier: {
    id: string;
    name: string;
    displayName: string;
    features: string[];
    maxSignalsPerDay: number;
    maxSlaveAccounts: number;
  };
  billingCycle: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setAccessToken: (accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      subscription: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set((state) => ({
        user,
        isAuthenticated: !!user || !!state.accessToken,
      })),

      setSubscription: (subscription) => set({ subscription }),

      setAccessToken: (accessToken) => set({
        accessToken,
        isAuthenticated: true,
        isLoading: false,
      }),

      setTokens: (accessToken, refreshToken) => set({ 
        accessToken, 
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () => set({
        user: null,
        subscription: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState> | undefined;

        return {
          ...currentState,
          ...persisted,
          isAuthenticated: !!persisted?.accessToken,
          isLoading: false,
        };
      },
    }
  )
);

// =============================================================================
// SIGNAL STORE
// =============================================================================

interface Signal {
  id: string;
  action: 'OPEN' | 'CLOSE' | 'MODIFY';
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  sl?: number;
  tp?: number;
  status: string;
  createdAt: string;
  execution?: {
    status: string;
    executedAt?: string;
    executedPrice?: number;
  };
}

interface SignalStats {
  totalSignals: number;
  executed: number;
  failed: number;
  skipped: number;
  expired: number;
  bySymbol: Record<string, number>;
  byAction: {
    OPEN: number;
    CLOSE: number;
    MODIFY: number;
  };
}

interface SignalState {
  signals: Signal[];
  stats: SignalStats | null;
  isLoading: boolean;
  
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  setStats: (stats: SignalStats) => void;
  setLoading: (loading: boolean) => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  signals: [],
  stats: null,
  isLoading: false,

  setSignals: (signals) => set({ signals }),
  
  addSignal: (signal) => set((state) => ({ 
    signals: [signal, ...state.signals].slice(0, 100) 
  })),
  
  setStats: (stats) => set({ stats }),
  
  setLoading: (isLoading) => set({ isLoading }),
}));

// =============================================================================
// UI STORE
// =============================================================================

interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
