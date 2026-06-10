'use client';

import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useEffect, useState } from 'react';

// CoinLore API - Real data
const COINLORE_URL = 'https://api.coinlore.net/api';

type CoinData = {
  symbol: string;
  price: number;
  change24h: number;
};

export function TopMovers() {
  const [gainers, setGainers] = useState<CoinData[]>([]);
  const [losers, setLosers] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopMovers = async () => {
      try {
        const response = await fetch(`${COINLORE_URL}/tickers/?limit=50`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          // Process all coins
          const coins: CoinData[] = data.data.map((coin: any) => ({
            symbol: coin.symbol,
            price: parseFloat(coin.price_usd),
            change24h: parseFloat(coin.percent_change_24h),
          }));
          
          // Sort by change24h (highest first)
          const sorted = [...coins].sort((a, b) => b.change24h - a.change24h);
          
          // Top 4 gainers
          const topGainers = sorted.slice(0, 4);
          
          // Top 4 losers (sort by lowest change)
          const topLosers = [...coins].sort((a, b) => a.change24h - b.change24h).slice(0, 4);
          
          setGainers(topGainers);
          setLosers(topLosers);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching top movers:', error);
        setLoading(false);
      }
    };
    
    fetchTopMovers();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchTopMovers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-4">
        <div className="card p-5 flex-1 text-center text-muted">Loading top gainers...</div>
        <div className="card p-5 flex-1 text-center text-muted">Loading top losers...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Top Gainers Card */}
      <div className="card p-5 flex-1">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpRight className="text-up" size={18} />
          <h3 className="font-semibold">Top Gainers</h3>
        </div>
        <ul className="space-y-3">
          {gainers.map((coin) => (
            <li key={coin.symbol}>
              <Link href={`/trade/${coin.symbol}`} className="flex items-center justify-between hover:opacity-80">
                <span className="font-medium text-sm">{coin.symbol}</span>
                <span className="tabular-nums text-sm">
                  ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-up text-sm">
                  +{coin.change24h.toFixed(2)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Top Losers Card */}
      <div className="card p-5 flex-1">
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownRight className="text-down" size={18} />
          <h3 className="font-semibold">Top Losers</h3>
        </div>
        <ul className="space-y-3">
          {losers.map((coin) => (
            <li key={coin.symbol}>
              <Link href={`/trade/${coin.symbol}`} className="flex items-center justify-between hover:opacity-80">
                <span className="font-medium text-sm">{coin.symbol}</span>
                <span className="tabular-nums text-sm">
                  ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-down text-sm">
                  {coin.change24h.toFixed(2)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}