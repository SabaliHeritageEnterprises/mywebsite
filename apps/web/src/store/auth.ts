'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fbRegister, fbLogin, fbLogout, fbResetPassword, updateUserBalance, type AppUser } from '@/lib/fb';

// Types for trading data
export interface TradeRecord {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  price: number;
  quantity: number;
  total: number;
  timestamp: string;
  status: string;
  pnl: number;
  percentageGain: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  pnl: number;
  openTime: string;
  status: 'OPEN' | 'CLOSED';
}

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  price: number;
  quantity: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  createdAt: string;
}

interface AuthState {
  user: AppUser | null;
  initialized: boolean;
  loading: boolean;
  positions: Position[];
  orders: Order[];
  tradeHistory: TradeRecord[];
  setUser: (u: AppUser | null) => void;
  setInitialized: (v: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateBalance: (newBalance: number) => Promise<void>;
  addPosition: (position: Position) => void;
  addOrder: (order: Order) => void;
  addTradeHistory: (trade: TradeRecord) => void;
  closePosition: (positionId: string) => void;
  cancelOrder: (orderId: string) => void;
  clearUserData: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      initialized: false,
      loading: false,
      positions: [],
      orders: [],
      tradeHistory: [],

      setUser: (u) => set({ user: u }),
      setInitialized: (v) => set({ initialized: v }),

      login: async (email, password) => {
        set({ loading: true });
        try {
          await fbLogin(email, password);
        } finally {
          set({ loading: false });
        }
      },

      register: async (email, password, displayName) => {
        set({ loading: true });
        try {
          await fbRegister(email, password, displayName);
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        const u = get().user;
        await fbLogout(u?.uid, u?.email);
        set({ user: null, positions: [], orders: [], tradeHistory: [] });
      },

      resetPassword: async (email) => {
        await fbResetPassword(email);
      },

      updateBalance: async (newBalance: number) => {
        const user = get().user;
        if (!user) return;
        
        try {
          await updateUserBalance(user.uid, newBalance);
          set({ user: { ...user, balance: newBalance } });
        } catch (error) {
          console.error('Failed to update balance:', error);
        }
      },

      addPosition: (position) => {
        set((state) => ({
          positions: [position, ...state.positions]
        }));
      },

      addOrder: (order) => {
        set((state) => ({
          orders: [order, ...state.orders]
        }));
      },

      addTradeHistory: (trade) => {
        set((state) => ({
          tradeHistory: [trade, ...state.tradeHistory]
        }));
      },

      closePosition: (positionId) => {
        set((state) => ({
          positions: state.positions.map(p =>
            p.id === positionId ? { ...p, status: 'CLOSED' } : p
          )
        }));
      },

      cancelOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.map(o =>
            o.id === orderId ? { ...o, status: 'CANCELLED' } : o
          )
        }));
      },

      clearUserData: () => {
        set({ positions: [], orders: [], tradeHistory: [] });
      },
    }),
    {
      name: 'apex-trade-storage',
      partialize: (state) => ({
        positions: state.positions,
        orders: state.orders,
        tradeHistory: state.tradeHistory,
      }),
    }
  )
);