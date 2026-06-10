'use client';

import { create } from 'zustand';
import { liveMarketData } from '@/lib/liveMarketData';

type Ticker = {
  symbol: string;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
};

type MarketState = {
  tickers: Record<string, Ticker>;
  isLoading: boolean;
  setSnapshot: (tickers: Record<string, Ticker>) => void;
  updateTicker: (symbol: string, price: number, change24h: string, high?: number, low?: number, volume?: number) => void;
};

export const useMarket = create<MarketState>((set) => ({
  tickers: {},
  isLoading: true,
  
  setSnapshot: (tickers) => {
    set({ tickers, isLoading: false });
  },
  
  updateTicker: (symbol, price, change24h, high, low, volume) => {
    set((state) => ({
      tickers: {
        ...state.tickers,
        [symbol]: {
          symbol,
          price,
          change24h: parseFloat(change24h),
          high24h: high,
          low24h: low,
          volume24h: volume,
        },
      },
      isLoading: false,
    }));
  },
}));

// Initialize WebSocket connection
if (typeof window !== 'undefined') {
  setTimeout(() => {
    liveMarketData.connectCrypto();
    liveMarketData.connectForex();
    
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSD', 'GBPUSD'];
    symbols.forEach(symbol => {
      liveMarketData.subscribe(symbol, (price, change24h) => {
        useMarket.getState().updateTicker(symbol, price, change24h);
      });
    });
  }, 1000);
}