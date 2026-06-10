'use client';

import { create } from 'zustand';
import type { Ticker } from '@/lib/types';

// CoinLore API - Free, no API key needed
const COINLORE_URL = 'https://api.coinlore.net/api';

interface MarketState {
  tickers: Record<string, Ticker>;
  isLoading: boolean;
  setSnapshot: (list: Ticker[]) => void;
  upsert: (t: Ticker) => void;
  fetchRealPrices: () => Promise<void>;
}

/** Live in-memory ticker cache fed by the WebSocket snapshot stream + CoinLore API fallback */
export const useMarket = create<MarketState>((set, get) => ({
  tickers: {},
  isLoading: true,
  
  setSnapshot: (list) =>
    set(() => {
      const next: Record<string, Ticker> = {};
      for (const t of list) next[t.symbol] = t;
      return { tickers: next, isLoading: false };
    }),
    
  upsert: (t) => set((s) => ({ 
    tickers: { ...s.tickers, [t.symbol]: t },
    isLoading: false,
  })),
  
  fetchRealPrices: async () => {
    try {
      const response = await fetch(`${COINLORE_URL}/tickers/?limit=100`);
      const data = await response.json();
      const tickers: Record<string, Ticker> = {};
      
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((coin: any) => {
          tickers[coin.symbol] = {
            symbol: coin.symbol,
            price: parseFloat(coin.price_usd),
            change24h: parseFloat(coin.percent_change_24h),
            high24h: parseFloat(coin.price_usd) * 1.02,
            low24h: parseFloat(coin.price_usd) * 0.98,
            volume24h: parseFloat(coin.volume24),
            ts: Date.now(),
          };
        });
        
        set({ tickers, isLoading: false });
        console.log(`✅ Loaded ${Object.keys(tickers).length} trading pairs from CoinLore`);
      }
    } catch (error) {
      console.error('Failed to fetch prices from CoinLore:', error);
      set({ isLoading: false });
    }
  },
}));

// Auto-fetch real prices on app load (only in browser)
if (typeof window !== 'undefined') {
  // Initial fetch
  useMarket.getState().fetchRealPrices();
  
  // Refresh every 30 seconds
  setInterval(() => {
    useMarket.getState().fetchRealPrices();
  }, 30000);
}