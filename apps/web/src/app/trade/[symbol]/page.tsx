'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { TradingViewChart } from '@/components/trading-view-chart';
import { OrderPanel } from '@/components/order-panel';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';
import { liveMarketData } from '@/lib/liveMarketData';
import { fmtPrice, fmtChange, cn } from '@/lib/utils';
import type { MarketPair, Trade, Position } from '@/lib/types';

type BottomTab = 'positions' | 'orders' | 'history';

const MOCK_PAIRS: MarketPair[] = [
  { id: '1', symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', displayName: 'Bitcoin / USDT', type: 'CRYPTO', lastPrice: '43250.75', change24h: '2.5', high24h: '43800', low24h: '42800', volume24h: '1.2B', marketCap: '800B', pricePrecision: 2, qtyPrecision: 6, isTrending: true },
  { id: '2', symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', displayName: 'Ethereum / USDT', type: 'CRYPTO', lastPrice: '2250.30', change24h: '1.8', high24h: '2280', low24h: '2230', volume24h: '890M', marketCap: '270B', pricePrecision: 2, qtyPrecision: 6, isTrending: true },
  { id: '3', symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', displayName: 'Solana / USDT', type: 'CRYPTO', lastPrice: '98.45', change24h: '-0.5', high24h: '100.20', low24h: '97.80', volume24h: '340M', marketCap: '42B', pricePrecision: 2, qtyPrecision: 6, isTrending: false },
  { id: '4', symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', displayName: 'BNB / USDT', type: 'CRYPTO', lastPrice: '305.20', change24h: '0.2', high24h: '308', low24h: '303', volume24h: '210M', marketCap: '50B', pricePrecision: 2, qtyPrecision: 6, isTrending: false },
  { id: '5', symbol: 'EURUSD', base: 'EUR', quote: 'USD', displayName: 'Euro / US Dollar', type: 'FOREX', lastPrice: '1.0895', change24h: '0.15', high24h: '1.0920', low24h: '1.0870', volume24h: '2.1B', marketCap: '', pricePrecision: 4, qtyPrecision: 4, isTrending: true },
  { id: '6', symbol: 'GBPUSD', base: 'GBP', quote: 'USD', displayName: 'British Pound / US Dollar', type: 'FOREX', lastPrice: '1.2745', change24h: '-0.08', high24h: '1.2780', low24h: '1.2710', volume24h: '1.8B', marketCap: '', pricePrecision: 4, qtyPrecision: 4, isTrending: false },
];

export default function TradeTerminal() {
  const params = useParams();
  const router = useRouter();
  const symbol = String(params.symbol).toUpperCase();
  const { user } = useAuth();

  const [pairs] = useState<MarketPair[]>(MOCK_PAIRS);
  const [pair, setPair] = useState<MarketPair | null>(null);
  const [tab, setTab] = useState<BottomTab>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Trade[]>([]);
  const [history, setHistory] = useState<Trade[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const live = useMarket((s) => (pair ? s.tickers[pair.symbol] : undefined));

  // Get current pair
  useEffect(() => {
    const found = pairs.find(p => p.symbol === symbol);
    setPair(found || null);
  }, [symbol, pairs]);

  // Subscribe to live data for this pair
  useEffect(() => {
    if (!pair) return;
    
    setIsConnecting(true);
    setWsStatus('connecting');
    
    try {
      // Ensure WebSocket is connected
      liveMarketData.connectCrypto();
      liveMarketData.connectForex();
      
      // Set a timeout to consider connection established
      const timer = setTimeout(() => {
        setIsConnecting(false);
        setWsStatus('connected');
      }, 2000);
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setWsStatus('disconnected');
      setIsConnecting(false);
    }
  }, [pair]);

  const loadUserData = useCallback(() => {
    if (!user) return;
    setPositions([]);
    setOrders([]);
    setHistory([]);
  }, [user]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  const closePosition = async (id: string) => {
    alert('Position closed (demo)');
    loadUserData();
  };
  
  const cancelOrder = async (id: string) => {
    alert('Order cancelled (demo)');
    loadUserData();
  };

  if (!pair) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="p-10 text-center text-muted">Loading market…</div>
      </div>
    );
  }

  const price = live?.price ?? Number(pair.lastPrice);
  const change = live?.change24h ?? Number(pair.change24h);
  const up = change >= 0;
  const high = live?.high24h ?? Number(pair.high24h);
  const low = live?.low24h ?? Number(pair.low24h);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Connection Status Banner */}
      {wsStatus !== 'connected' && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-500 text-sm py-1.5 px-4 text-center">
          {wsStatus === 'connecting' ? '🔄 Connecting to live market data...' : '⚠️ Reconnecting to market data...'}
        </div>
      )}

      {/* Symbol header */}
      <div className="border-b border-border bg-bg-soft">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center gap-6 overflow-x-auto">
          <div>
            <h1 className="text-xl font-bold">{pair.displayName}</h1>
            <span className="text-xs text-muted">{pair.type}</span>
          </div>
          <div className="text-right">
            <div className={cn('text-xl font-bold tabular-nums', up ? 'text-up' : 'text-down')}>
              {fmtPrice(price, pair.pricePrecision)}
            </div>
          </div>
          <Stat label="24h Change" value={fmtChange(change)} className={up ? 'text-up' : 'text-down'} />
          <Stat label="24h High" value={fmtPrice(high, pair.pricePrecision)} />
          <Stat label="24h Low" value={fmtPrice(low, pair.pricePrecision)} />
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-4 w-full flex-1">
        <div className="grid grid-cols-12 gap-4">
          {/* Left: pair selector */}
          <aside className="col-span-12 lg:col-span-2 card p-2 max-h-[600px] overflow-y-auto order-2 lg:order-1">
            <div className="text-xs text-muted px-2 py-1">Markets</div>
            {pairs.map((p) => {
              const t = useMarket.getState().tickers[p.symbol];
              const pc = t?.change24h ?? Number(p.change24h);
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/trade/${p.symbol}`)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-bg-hover',
                    p.symbol === pair.symbol && 'bg-bg-hover',
                  )}
                >
                  <span>{p.displayName}</span>
                  <span className={cn('text-xs tabular-nums', pc >= 0 ? 'text-up' : 'text-down')}>
                    {fmtChange(pc)}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Center: chart */}
          <section className="col-span-12 lg:col-span-7 order-1 lg:order-2">
            <TradingViewChart symbol={pair.symbol} type={pair.type} height={560} />
          </section>

          {/* Right: order panel */}
          <section className="col-span-12 lg:col-span-3 order-3">
            <OrderPanel pair={pair} onPlaced={loadUserData} />
          </section>
        </div>

        {/* Bottom: positions / orders / history */}
        <div className="card mt-4">
          <div className="flex gap-1 border-b border-border p-2">
            {(['positions', 'orders', 'history'] as BottomTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn('px-3 py-1.5 rounded text-sm capitalize',
                  tab === t ? 'bg-bg-hover text-gold' : 'text-muted')}
              >
                {t === 'positions' ? 'Open Positions' : t === 'orders' ? 'Open Orders' : 'Trade History'}
              </button>
            ))}
          </div>

          <div className="p-2 overflow-x-auto">
            {!user ? (
              <p className="p-6 text-center text-muted text-sm">Log in to view your positions and orders.</p>
            ) : tab === 'positions' ? (
              <PositionsTable positions={positions} onClose={closePosition} />
            ) : tab === 'orders' ? (
              <OrdersTable orders={orders} onCancel={cancelOrder} />
            ) : (
              <HistoryTable trades={history} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ... (keep all the helper functions Stat, PositionsTable, OrdersTable, HistoryTable the same as before)