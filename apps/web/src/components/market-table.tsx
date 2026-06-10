'use client';

import { useMarket } from '@/store/market';

export function MarketTable({ pairs, favorites, onToggleFavorite }: any) {
  const tickers = useMarket((s) => s.tickers);
  
  // Enhance pairs with live data
  const enhancedPairs = pairs.map((pair: any) => {
    const liveData = tickers[pair.symbol];
    return {
      ...pair,
      price: liveData?.price || pair.price,
      change24h: liveData?.change24h || pair.change24h,
    };
  });

  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr className="text-left text-muted text-sm">
            <th className="px-4 py-3">Pair</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">24h Change</th>
            <th className="px-4 py-3 text-right">Volume</th>
          </tr>
        </thead>
        <tbody>
          {enhancedPairs.map((pair: any) => (
            <tr key={pair.symbol} className="border-b border-border/40 hover:bg-bg-hover">
              <td className="px-4 py-3 font-medium">{pair.displayName}</td>
              <td className="px-4 py-3 text-right font-mono">
                ${pair.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={pair.change24h >= 0 ? 'text-up' : 'text-down'}>
                  {pair.change24h >= 0 ? '+' : ''}{pair.change24h}%
                </span>
              </td>
              <td className="px-4 py-3 text-right text-muted">{pair.volume || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}