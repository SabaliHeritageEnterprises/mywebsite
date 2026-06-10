'use client';

import { useEffect, useState } from 'react';
import { liveMarketData } from '@/lib/liveMarketData';
import { Search } from 'lucide-react';

type MarketPair = {
  symbol: string;
  displayName: string;
  type: 'CRYPTO' | 'FOREX';
  price: number | null;
  change24h: string;
};

export default function MarketsPage() {
  const [pairs, setPairs] = useState<MarketPair[]>([
    // Crypto pairs (from Binance)
    { symbol: 'BTCUSDT', displayName: 'Bitcoin / USDT', type: 'CRYPTO', price: null, change24h: '0' },
    { symbol: 'ETHUSDT', displayName: 'Ethereum / USDT', type: 'CRYPTO', price: null, change24h: '0' },
    { symbol: 'SOLUSDT', displayName: 'Solana / USDT', type: 'CRYPTO', price: null, change24h: '0' },
    { symbol: 'BNBUSDT', displayName: 'BNB / USDT', type: 'CRYPTO', price: null, change24h: '0' },
    // Forex pairs (from Live-Rates)
    { symbol: 'EURUSD', displayName: 'Euro / US Dollar', type: 'FOREX', price: null, change24h: '0' },
    { symbol: 'GBPUSD', displayName: 'British Pound / US Dollar', type: 'FOREX', price: null, change24h: '0' },
  ]);

  const [search, setSearch] = useState('');

  useEffect(() => {
    // Connect to crypto WebSocket
    liveMarketData.connectCrypto();
    
    // Connect to forex REST API
    liveMarketData.connectForex();
    
    // Subscribe to all pairs
    pairs.forEach(pair => {
      liveMarketData.subscribe(pair.symbol, (price, change24h) => {
        setPairs(prev => prev.map(p => 
          p.symbol === pair.symbol 
            ? { ...p, price, change24h }
            : p
        ));
      });
    });
    
    // Cleanup on unmount
    return () => liveMarketData.disconnect();
  }, []);

  const filteredPairs = pairs.filter(p => 
    p.displayName.toLowerCase().includes(search.toLowerCase()) ||
    p.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Live Markets</h1>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-gold"
          />
        </div>
        
        {/* Market Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-400">Pair</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-400">Price</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-400">24h Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredPairs.map((pair) => (
                <tr key={pair.symbol} className="hover:bg-gray-800 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{pair.displayName}</p>
                      <p className="text-xs text-gray-500">{pair.type}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {pair.price !== null 
                      ? `$${pair.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'Loading...'
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    {pair.change24h !== '0' ? (
                      <span className={parseFloat(pair.change24h) >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {parseFloat(pair.change24h) >= 0 ? '+' : ''}{pair.change24h}%
                      </span>
                    ) : 'Loading...'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}