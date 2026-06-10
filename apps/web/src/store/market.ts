'use client';

import { create } from 'zustand';
import { liveMarketData } from '@/lib/liveMarketData';
import { fetchAllTickers, convertToMarketPairs } from '@/lib/coinlore';
import { api } from '@/lib/api';

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
  allPairs: MarketPair[];
  filteredPairs: MarketPair[];
  searchQuery: string;
  selectedType: 'ALL' | 'CRYPTO' | 'FOREX';
  isLoading: boolean;
  setSnapshot: (tickers: Record<string, Ticker>) => void;
  setPairs: (pairs: MarketPair[]) => void;
  updateTicker: (symbol: string, price: number, change24h: string, high?: number, low?: number, volume?: number) => void;
  setSearch: (query: string) => void;
  setType: (type: 'ALL' | 'CRYPTO' | 'FOREX') => void;
  refreshPrices: () => Promise<void>;
};

export const useMarket = create<MarketState>((set, get) => ({
  tickers: {},
  allPairs: [],
  filteredPairs: [],
  searchQuery: '',
  selectedType: 'ALL',
  isLoading: true,
  
  setSnapshot: (tickers) => {
    set({ tickers, isLoading: false });
  },
  
  setPairs: (pairs) => {
    set({ allPairs: pairs, filteredPairs: pairs, isLoading: false });
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
    }));
    
    // Also update pairs with live data
    const { allPairs } = get();
    const updatedPairs = allPairs.map(pair => {
      if (pair.symbol === symbol || pair.base === symbol) {
        return {
          ...pair,
          lastPrice: price.toString(),
          change24h: change24h,
        };
      }
      return pair;
    });
    set({ allPairs: updatedPairs, filteredPairs: updatedPairs });
  },
  
  setSearch: (query) => {
    const { allPairs, selectedType } = get();
    let filtered = allPairs;
    
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(p => p.type === selectedType);
    }
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(p => 
        p.displayName.toLowerCase().includes(lowerQuery) ||
        p.symbol.toLowerCase().includes(lowerQuery)
      );
    }
    
    set({ searchQuery: query, filteredPairs: filtered });
  },
  
  setType: (type) => {
    const { allPairs, searchQuery } = get();
    let filtered = allPairs;
    
    if (type !== 'ALL') {
      filtered = filtered.filter(p => p.type === type);
    }
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.displayName.toLowerCase().includes(lowerQuery) ||
        p.symbol.toLowerCase().includes(lowerQuery)
      );
    }
    
    set({ selectedType: type, filteredPairs: filtered });
  },
  
  refreshPrices: async () => {
    try {
      // Try your API first
      const response = await api.get<MarketPair[]>('/market/pairs');
      set({ allPairs: response.data, filteredPairs: response.data, isLoading: false });
    } catch (error) {
      // Fallback to CoinLore for 1400+ pairs
      console.log('Falling back to CoinLore API for 1400+ pairs');
      const tickers = await fetchAllTickers();
      const pairs = convertToMarketPairs(tickers);
      set({ allPairs: pairs, filteredPairs: pairs, isLoading: false });
    }
  },
}));

// Initialize on app load
if (typeof window !== 'undefined') {
  // Fetch all pairs
  useMarket.getState().refreshPrices();
  
  // Connect WebSocket for live updates on top pairs
  setTimeout(() => {
    liveMarketData.connectCrypto();
    liveMarketData.connectForex();
    
    // Top 50 symbols for real-time updates
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 
      'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
      'MATICUSDT', 'SHIBUSDT', 'TRXUSDT', 'ATOMUSDT', 'LTCUSDT',
      'BCHUSDT', 'NEARUSDT', 'ALGOUSDT', 'VETUSDT', 'FILUSDT',
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF'
    ];
    
    symbols.forEach(symbol => {
      liveMarketData.subscribe(symbol, (price, change24h, high, low, volume) => {
        useMarket.getState().updateTicker(symbol, price, change24h, high, low, volume);
      });
    });
  }, 1000);
  
  // Refresh prices every 30 seconds
  setInterval(() => {
    useMarket.getState().refreshPrices();
  }, 30000);
}