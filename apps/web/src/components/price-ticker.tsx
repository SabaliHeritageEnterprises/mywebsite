'use client';

import { useMarket } from '@/store/market';
import { fmtPrice, fmtChange, cn } from '@/lib/utils';
import Link from 'next/link';

export function PriceTicker() {
  const { tickers, isLoading } = useMarket();
  const list = Object.values(tickers).slice(0, 30); // Top 30 by market cap

  if (isLoading || list.length === 0) {
    return (
      <div className="h-10 border-y border-border/60 bg-bg-soft flex items-center px-4 text-xs text-muted">
        Loading live market data...
      </div>
    );
  }

  // Duplicate for seamless marquee
  const loop = [...list, ...list];

  return (
    <div className="h-10 border-y border-border/60 bg-bg-soft overflow-hidden relative">
      <div className="flex items-center gap-8 animate-marquee whitespace-nowrap absolute h-full px-4">
        {loop.map((t, i) => {
          const up = t.change24h >= 0;
          return (
            <Link
              key={`${t.symbol}-${i}`}
              href={`/trade/${t.symbol}`}
              className="flex items-center gap-2 text-sm hover:opacity-80"
            >
              <span className="font-medium">{t.symbol}</span>
              <span className="tabular-nums">{fmtPrice(t.price)}</span>
              <span className={cn('tabular-nums text-xs', up ? 'text-up' : 'text-down')}>
                {fmtChange(t.change24h)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}