'use client';

import { liveMarketData } from './liveMarketData';
import type { Ticker } from '@/lib/types';

// Store tickers in memory
let tickersCache: Record<string, Ticker> = {};
let tickerCallbacks: ((tickers: Ticker[]) => void)[] = [];

// Notify all subscribers when tickers update
function notifySubscribers() {
  const tickerArray = Object.values(tickersCache);
  tickerCallbacks.forEach(cb => cb([...tickerArray]));
}

// Subscribe to real-time data from Binance + Forex APIs
export function onTickers(callback: (tickers: Ticker[]) => void): () => void {
  // Add callback to list
  tickerCallbacks.push(callback);
  
  // Send current cache immediately if it has data
  if (Object.keys(tickersCache).length > 0) {
    callback(Object.values(tickersCache));
  }
  
  // Subscribe to individual symbols
  const symbols = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 
    'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 
    'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'SHIBUSDT',
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 
    'USDCAD', 'NZDUSD', 'USDCHF'
  ];
  
  symbols.forEach(symbol => {
    liveMarketData.subscribe(symbol, (price, change24h, high, low, volume) => {
      tickersCache[symbol] = {
        symbol,
        price,
        change24h: parseFloat(change24h),
        high24h: high || 0,
        low24h: low || 0,
        volume24h: volume || 0,
        ts: Date.now(),
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
      high24h: high || 0,
      low24h: low || 0,
      volume24h: volume || 0,
      ts: Date.now(),
    });
  };
  
  liveMarketData.subscribe(symbol, handler);
  liveMarketData.connectCrypto();
  liveMarketData.connectForex();
  
  return () => {};
}

// Helper to get current tickers
export function getCurrentTickers(): Ticker[] {
  return Object.values(tickersCache);
}

// Disconnect all connections
export function disconnectMarketData() {
  liveMarketData.disconnect();
  tickerCallbacks = [];
  tickersCache = {};
}