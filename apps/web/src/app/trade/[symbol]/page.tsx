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

// Mock market pairs for the sidebar
const MOCK_PAIRS: MarketPair[] = [
  { id: '1', symbol: 'BTCUSDT', displayName: 'Bitcoin / USDT', type: 'CRYPTO', lastPrice: 43250.75, change24h: '2.5', high24h: '43800', low24h: '42800', volume24h: '1.2B', pricePrecision: 2 },
  { id: '2', symbol: 'ETHUSDT', displayName: 'Ethereum / USDT', type: 'CRYPTO', lastPrice: 2250.30, change24h: '1.8', high24h: '2280', low24h: '2230', volume24h: '890M', pricePrecision: 2 },
  { id: '3', symbol: 'SOLUSDT', displayName: 'Solana / USDT', type: 'CRYPTO', lastPrice: 98.45, change24h: '-0.5', high24h: '100.20', low24h: '97.80', volume24h: '340M', pricePrecision: 2 },
  { id: '4', symbol: 'BNBUSDT', displayName: 'BNB / USDT', type: 'CRYPTO', lastPrice: 305.20, change24h: '0.2', high24h: '308', low24h: '303', volume24h: '210M', pricePrecision: 2 },
  { id: '5', symbol: 'EURUSD', displayName: 'Euro / US Dollar', type: 'FOREX', lastPrice: 1.0895, change24h: '0.15', high24h: '1.0920', low24h: '1.0870', volume24h: '2.1B', pricePrecision: 4 },
  { id: '6', symbol: 'GBPUSD', displayName: 'British Pound / US Dollar', type: 'FOREX', lastPrice: 1.2745, change24h: '-0.08', high24h: '1.2780', low24h: '1.2710', volume24h: '1.8B', pricePrecision: 4 },
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

  const live = useMarket((s) => (pair ? s.tickers[pair.symbol] : undefined));

  // Get current pair
  useEffect(() => {
    const found = pairs.find(p => p.symbol === symbol);
    setPair(found || null);
  }, [symbol, pairs]);

  // Subscribe to live data for this pair
  useEffect(() => {
    if (!pair) return;
    
    // Ensure WebSocket is connected
    liveMarketData.connectCrypto();
    liveMarketData.connectForex();
    
    // The market store already handles updates via ws.ts
    // The 'live' variable above will update automatically
    
  }, [pair]);

  const loadUserData = useCallback(() => {
    if (!user) return;
    // These would normally fetch from API, but for now use mock empty data
    setPositions([]);
    setOrders([]);
    setHistory([]);
  }, [user]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  const closePosition = async (id: string) => {
    // Mock close - would call API
    alert('Position closed (demo)');
    loadUserData();
  };
  
  const cancelOrder = async (id: string) => {
    // Mock cancel - would call API
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

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={cn('text-sm tabular-nums', className)}>{value}</div>
    </div>
  );
}

function PositionsTable({ positions, onClose }: { positions: Position[]; onClose: (id: string) => void }) {
  if (positions.length === 0) return <p className="p-6 text-center text-muted text-sm">No open positions.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-muted text-left">
        <th className="p-2">Pair</th><th className="p-2">Side</th><th className="p-2 text-right">Qty</th>
        <th className="p-2 text-right">Entry</th><th className="p-2 text-right">Mark</th>
        <th className="p-2 text-right">uPnL</th><th className="p-2 text-right">Action</th>
      </tr></thead>
      <tbody>
        {positions.map((p) => {
          const mark = p.markPrice ?? Number(p.pair.lastPrice);
          const pnl = p.unrealizedPnl ?? 0;
          return (
            <tr key={p.id} className="border-t border-border/50">
              <td className="p-2">{p.pair.displayName}</td>
              <td className={cn('p-2', p.side === 'BUY' ? 'text-up' : 'text-down')}>{p.side}</td>
              <td className="p-2 text-right tabular-nums">{p.quantity}</td>
              <td className="p-2 text-right tabular-nums">{fmtPrice(p.entryPrice)}</td>
              <td className="p-2 text-right tabular-nums">{fmtPrice(mark)}</td>
              <td className={cn('p-2 text-right tabular-nums', pnl >= 0 ? 'text-up' : 'text-down')}>{fmtPrice(pnl)}</td>
              <td className="p-2 text-right">
                <button onClick={() => onClose(p.id)} className="text-gold hover:underline text-xs">Close</button>
               </td>
             </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function OrdersTable({ orders, onCancel }: { orders: Trade[]; onCancel: (id: string) => void }) {
  if (orders.length === 0) return <p className="p-6 text-center text-muted text-sm">No open orders.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-muted text-left">
        <th className="p-2">Pair</th><th className="p-2">Type</th><th className="p-2">Side</th>
        <th className="p-2 text-right">Price</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Action</th>
       </tr></thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="border-t border-border/50">
            <td className="p-2">{o.pair.displayName}</td>
            <td className="p-2">{o.type}</td>
            <td className={cn('p-2', o.side === 'BUY' ? 'text-up' : 'text-down')}>{o.side}</td>
            <td className="p-2 text-right tabular-nums">{fmtPrice(o.price)}</td>
            <td className="p-2 text-right tabular-nums">{o.quantity}</td>
            <td className="p-2 text-right">
              <button onClick={() => onCancel(o.id)} className="text-down hover:underline text-xs">Cancel</button>
             </td>
           </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return <p className="p-6 text-center text-muted text-sm">No trade history yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-muted text-left">
        <th className="p-2">Pair</th><th className="p-2">Type</th><th className="p-2">Side</th>
        <th className="p-2 text-right">Price</th><th className="p-2 text-right">Qty</th>
        <th className="p-2">Status</th><th className="p-2 text-right">Date</th>
       </tr></thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id} className="border-t border-border/50">
            <td className="p-2">{t.pair.displayName}</td>
            <td className="p-2">{t.type}</td>
            <td className={cn('p-2', t.side === 'BUY' ? 'text-up' : 'text-down')}>{t.side}</td>
            <td className="p-2 text-right tabular-nums">{fmtPrice(t.filledPrice ?? t.price)}</td>
            <td className="p-2 text-right tabular-nums">{t.quantity}</td>
            <td className="p-2 text-xs">{t.status}</td>
            <td className="p-2 text-right text-xs text-muted">{new Date(t.createdAt).toLocaleString()}</td>
           </tr>
        ))}
      </tbody>
    </table>
  );
}