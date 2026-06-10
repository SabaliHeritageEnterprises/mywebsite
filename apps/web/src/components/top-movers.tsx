'use client';

import Link from 'next/link';
import { useMarket } from '@/store/market';
import { fmtPrice, fmtChange, cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function TopMovers() {
  const { allPairs, isLoading } = useMarket();
  
  // Get top gainers and losers from allPairs
  const sortedByChange = [...allPairs].sort((a, b) => 
    parseFloat(b.change24h) - parseFloat(a.change24h)
  );
  
  const gainers = sortedByChange.slice(0, 4).map(pair => ({
    symbol: pair.symbol,
    price: parseFloat(pair.lastPrice),
    change24h: parseFloat(pair.change24h),
  }));
  
  const losers = [...sortedByChange].reverse().slice(0, 4).map(pair => ({
    symbol: pair.symbol,
    price: parseFloat(pair.lastPrice),
    change24h: parseFloat(pair.change24h),
  }));

  const Card = ({ title, items, up }: { title: string; items: typeof gainers; up: boolean }) => (
    <div className="card p-5 flex-1">
      <div className="flex items-center gap-2 mb-4">
        {up ? <ArrowUpRight className="text-up" size={18} /> : <ArrowDownRight className="text-down" size={18} />}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.symbol}>
            <Link href={`/trade/${item.symbol}`} className="flex items-center justify-between hover:opacity-80">
              <span className="font-medium text-sm">{item.symbol}</span>
              <span className="tabular-nums text-sm">{fmtPrice(item.price)}</span>
              <span className={cn('tabular-nums text-sm', item.change24h >= 0 ? 'text-up' : 'text-down')}>
                {fmtChange(item.change24h)}
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted text-sm">Loading market data…</li>}
      </ul>
    </div>
  );

  if (isLoading || allPairs.length === 0) {
    return (
      <div className="flex flex-col md:flex-row gap-4">
        <div className="card p-5 flex-1 text-center text-muted">Loading top gainers...</div>
        <div className="card p-5 flex-1 text-center text-muted">Loading top losers...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Card title="Top Gainers" items={gainers} up />
      <Card title="Top Losers" items={losers} up={false} />
    </div>
  );
}