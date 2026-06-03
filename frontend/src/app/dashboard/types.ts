export interface RecentSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  action: string;
  volume: number;
  price: number;
  closePrice?: number | null;
  profit?: number | null;
  pnl?: number | null;
  status: string;
  createdAt: string;
  execution?: {
    status: string;
    executedAt?: string | null;
    executedPrice?: number | null;
    closePrice?: number | null;
    profit?: number | null;
    pnl?: number | null;
  } | null;
}

export type PerformanceSource = 'ACCOUNT_SNAPSHOT' | 'SIGNAL_EXECUTION';

export type PerformanceGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface MT5Account {
  id: string;
  accountId: string;
  accountType: string;
  isConnected: boolean;
  balance: number | null;
  equity: number | null;
  profit: number | null;
}
