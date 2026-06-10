'use client';

import { create } from 'zustand';
import type { Ticker, MarketPair } from '@/lib/types';

// CoinLore API - Free, no API key needed
const COINLORE_URL = 'https://api.coinlore.net/api';

interface MarketState {
  tickers: Record<string, Ticker>;
  allPairs: MarketPair[];
  isLoading: boolean;
  setSnapshot: (list: Ticker[]) => void;
  upsert: (t: Ticker) => void;
  setPairs: (pairs: MarketPair[]) => void;
  fetchRealPrices: () => Promise<void>;
}

export const useMarket = create<MarketState>((set, get) => ({
  tickers: {},
  allPairs: [],
  isLoading: true,
  
  setSnapshot: (list) => {
    const next: Record<string, Ticker> = {};
    for (const t of list) next[t.symbol] = t;
    set({ tickers: next, isLoading: false });
  },
  
  upsert: (t) => set((s) => ({ 
    tickers: { ...s.tickers, [t.symbol]: t },
    isLoading: false,
  })),
  
  setPairs: (pairs) => {
    set({ allPairs: pairs });
  },
  
  fetchRealPrices: async () => {
    try {
      const response = await fetch(`${COINLORE_URL}/tickers/?limit=100`);
      const data = await response.json();
      const tickers: Record<string, Ticker> = {};
      const pairs: MarketPair[] = [];
      
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((coin: any) => {
          const ticker: Ticker = {
            symbol: coin.symbol,
            price: parseFloat(coin.price_usd),
            change24h: parseFloat(coin.percent_change_24h),
            high24h: parseFloat(coin.price_usd) * 1.02,
            low24h: parseFloat(coin.price_usd) * 0.98,
            volume24h: parseFloat(coin.volume24),
            ts: Date.now(),
          };
          tickers[coin.symbol] = ticker;
          
          // Also create MarketPair for top-movers
          pairs.push({
            id: coin.id,
            symbol: coin.symbol,
            base: coin.symbol,
            quote: 'USD',
            displayName: coin.name || coin.symbol,
            type: 'CRYPTO',
            lastPrice: coin.price_usd,
            change24h: coin.percent_change_24h,
            high24h: (parseFloat(coin.price_usd) * 1.02).toString(),
            low24h: (parseFloat(coin.price_usd) * 0.98).toString(),
            volume24h: coin.volume24,
            marketCap: coin.market_cap_usd,
            pricePrecision: parseFloat(coin.price_usd) < 1 ? 4 : 2,
            qtyPrecision: 6,
            isTrending: parseFloat(coin.percent_change_24h) > 5,
          });
        });
        
        set({ tickers, allPairs: pairs, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      set({ isLoading: false });
    }
  },
}));

// Auto-fetch on app load (only in browser)
if (typeof window !== 'undefined') {
  useMarket.getState().fetchRealPrices();
  setInterval(() => {
    useMarket.getState().fetchRealPrices();
  }, 30000);
}