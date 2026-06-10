// apps/web/src/store/market.ts
import { create } from 'zustand';
import { liveMarketData } from '@/lib/liveMarketData';

type Ticker = {
  symbol: string;
  price: number;
  change24h: number;
  volume?: string;
};

type MarketState = {
  tickers: Record<string, Ticker>;
  isLoading: boolean;
  updateTicker: (symbol: string, price: number, change24h: string) => void;
};

export const useMarket = create<MarketState>((set) => ({
  tickers: {},
  isLoading: true,
  
  updateTicker: (symbol, price, change24h) => {
    set((state) => ({
      tickers: {
        ...state.tickers,
        [symbol]: {
          symbol,
          price,
          change24h: parseFloat(change24h),
        },
      },
      isLoading: false,
    }));
  },
}));

// Initialize WebSocket connection and update store
if (typeof window !== 'undefined') {
  // Connect to live data
  liveMarketData.connectCrypto();
  liveMarketData.connectForex();
  
  // Subscribe to default pairs
  const defaultPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSD', 'GBPUSD'];
  
  defaultPairs.forEach(symbol => {
    liveMarketData.subscribe(symbol, (price, change24h) => {
      useMarket.getState().updateTicker(symbol, price, change24h);
    });
  });
}