'use client';

import { useEffect, useState } from 'react';
import { useMarket } from '@/store/market';

export function PriceTicker() {
  const tickers = useMarket((s) => s.tickers);
  const [tickerArray, setTickerArray] = useState<typeof tickers>({});

  useEffect(() => {
    setTickerArray(tickers);
  }, [tickers]);

  const items = Object.values(tickerArray);
  
  // Duplicate for seamless loop
  const allItems = [...items, ...items];

  if (items.length === 0) {
    return (
      <div className="bg-bg-soft border-y border-border overflow-hidden py-2">
        <div className="text-center text-muted text-sm">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="bg-bg-soft border-y border-border overflow-hidden py-2">
      <div className="animate-marquee whitespace-nowrap">
        {allItems.map((ticker, idx) => (
          <span key={idx} className="inline-flex items-center gap-2 mx-4">
            <span className="font-medium text-sm">{ticker.symbol}</span>
            <span className="font-mono text-sm">
              ${ticker.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={ticker.change24h >= 0 ? 'text-up text-sm' : 'text-down text-sm'}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}