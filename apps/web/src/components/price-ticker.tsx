'use client';

import { useEffect, useState } from 'react';
import { useMarket } from '@/store/market';
import { cn } from '@/lib/utils';

export function PriceTicker() {
  const { allPairs, tickers, isLoading } = useMarket();
  const [topMovers, setTopMovers] = useState<typeof tickers>({});
  
  useEffect(() => {
    // Get top 30 gainers from all pairs
    const sortedByChange = [...allPairs].sort((a, b) => 
      parseFloat(b.change24h) - parseFloat(a.change24h)
    );
    const top30 = sortedByChange.slice(0, 30);
    
    const moverTickers: typeof tickers = {};
    top30.forEach(pair => {
      moverTickers[pair.symbol] = tickers[pair.symbol] || {
        symbol: pair.symbol,
        price: parseFloat(pair.lastPrice),
        change24h: parseFloat(pair.change24h),
      };
    });
    
    setTopMovers(moverTickers);
  }, [allPairs, tickers]);
  
  const items = Object.values(topMovers);
  const allItems = [...items, ...items]; // Duplicate for seamless loop
  
  if (isLoading || items.length === 0) {
    return (
      <div className="bg-bg-soft border-y border-border overflow-hidden py-2">
        <div className="text-center text-muted text-sm">Loading 1,400+ market pairs...</div>
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
            <span className={cn('text-sm', ticker.change24h >= 0 ? 'text-up' : 'text-down')}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}