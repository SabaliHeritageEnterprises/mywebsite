'use client';

import Link from 'next/link';
import { useMarket } from '@/store/market';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function TopMovers() {
  const tickers = useMarket((s) => s.tickers);
  const list = Object.values(tickers);
  
  const sorted = [...list].sort((a, b) => b.change24h - a.change24h);
  const gainers = sorted.slice(0, 4);
  const losers = sorted.slice(-4).reverse();

  const Card = ({ title, items, up }: { title: string; items: typeof gainers; up: boolean }) => (
    <div className="card p-5 flex-1">
      <div className="flex items-center gap-2 mb-4">
        {up ? <ArrowUpRight className="text-up" size={18} /> : <ArrowDownRight className="text-down" size={18} />}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((t) => (
          <li key={t.symbol}>
            <Link href={`/trade/${t.symbol}`} className="flex items-center justify-between hover:opacity-80">
              <span className="font-medium text-sm">{t.symbol}</span>
              <span className="tabular-nums text-sm">
                ${t.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={t.change24h >= 0 ? 'text-up' : 'text-down'}>
                {t.change24h >= 0 ? '+' : ''}{t.change24h}%
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted text-sm">Loading market data…</li>}
      </ul>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Card title="Top Gainers" items={gainers} up />
      <Card title="Top Losers" items={losers} up={false} />
    </div>
  );
}