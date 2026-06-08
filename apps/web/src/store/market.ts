'use client';

import { create } from 'zustand';
import type { Ticker } from '@/lib/types';

interface MarketState {
  tickers: Record<string, Ticker>;
  setSnapshot: (list: Ticker[]) => void;
  upsert: (t: Ticker) => void;
}

/** Live in-memory ticker cache fed by the WebSocket snapshot stream. */
export const useMarket = create<MarketState>((set) => ({
  tickers: {},
  setSnapshot: (list) =>
    set(() => {
      const next: Record<string, Ticker> = {};
      for (const t of list) next[t.symbol] = t;
      return { tickers: next };
    }),
  upsert: (t) => set((s) => ({ tickers: { ...s.tickers, [t.symbol]: t } })),
}));
