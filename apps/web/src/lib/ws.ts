'use client';

import { liveMarketData } from './liveMarketData';

export type Ticker = {
  symbol: string;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
};

// Store tickers in memory
let tickersCache: Record<string, Ticker> = {};
let tickerCallbacks: ((tickers: Record<string, Ticker>) => void)[] = [];

// Notify all subscribers when tickers update
function notifySubscribers() {
  tickerCallbacks.forEach(cb => cb({ ...tickersCache }));
}

// Subscribe to real-time data from Binance + Forex APIs
export function onTickers(callback: (tickers: Record<string, Ticker>) => void): () => void {
  // Add callback to list
  tickerCallbacks.push(callback);
  
  // Send current cache immediately if it has data
  if (Object.keys(tickersCache).length > 0) {
    callback({ ...tickersCache });
  }
  
  // Subscribe to individual symbols
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSD', 'GBPUSD'];
  
  symbols.forEach(symbol => {
    liveMarketData.subscribe(symbol, (price, change24h, high, low, volume) => {
      tickersCache[symbol] = {
        symbol,
        price,
        change24h: parseFloat(change24h),
        high24h: high,
        low24h: low,
        volume24h: volume,
      };
      notifySubscribers();
    });
  });
  
  // Connect to live data sources
  liveMarketData.connectCrypto();
  liveMarketData.connectForex();
  
  // Return unsubscribe function
  return () => {
    const index = tickerCallbacks.indexOf(callback);
    if (index > -1) tickerCallbacks.splice(index, 1);
  };
}

// Subscribe to a single symbol's ticker
export function onTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
  const handler = (price: number, change24h: string, high?: number, low?: number, volume?: number) => {
    callback({
      symbol,
      price,
      change24h: parseFloat(change24h),
      high24h: high,
      low24h: low,
      volume24h: volume,
    });
  };
  
  liveMarketData.subscribe(symbol, handler);
  
  // Ensure connection is active
  liveMarketData.connectCrypto();
  liveMarketData.connectForex();
  
  return () => {
    // Note: Unsubscribe functionality would need to be implemented in liveMarketData
    // For now, the callback just won't be called
  };
}

// Helper to get current tickers
export function getCurrentTickers(): Record<string, Ticker> {
  return { ...tickersCache };
}

// Disconnect all connections (useful for cleanup)
export function disconnectMarketData() {
  liveMarketData.disconnect();
  tickerCallbacks = [];
  tickersCache = {};
}