'use client';

import { useState } from 'react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';
import { fmtPrice, cn } from '@/lib/utils';
import type { MarketPair, OrderSide, OrderType } from '@/lib/types';

interface Props {
  pair: MarketPair;
  onPlaced?: () => void;
}

/** Buy/Sell simulation order ticket (market, limit, stop-limit + SL/TP). */
export function OrderPanel({ pair, onPlaced }: Props) {
  const { user } = useAuth();
  const live = useMarket((s) => s.tickers[pair.symbol]);
  const lastPrice = live?.price ?? Number(pair.lastPrice);

  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('MARKET');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const effectivePrice = type === 'MARKET' ? lastPrice : parseFloat(price) || 0;
  const total = (parseFloat(quantity) || 0) * effectivePrice;

  const submit = async () => {
    setMsg(null);
    if (!user) { setMsg('Please log in to trade.'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { setMsg('Enter a quantity.'); return; }
    setBusy(true);
    try {
      await api.post('/trades/orders', {
        symbol: pair.symbol,
        side,
        type,
        quantity: parseFloat(quantity),
        ...(type !== 'MARKET' ? { price: parseFloat(price) } : {}),
        ...(stopLoss ? { stopLoss: parseFloat(stopLoss) } : {}),
        ...(takeProfit ? { takeProfit: parseFloat(takeProfit) } : {}),
      });
      setMsg(`✓ ${side} ${quantity} ${pair.base} order placed`);
      setQuantity(''); setPrice('');
      onPlaced?.();
    } catch (e) {
      setMsg(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4">
      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-bg-soft rounded-lg mb-4">
        {(['BUY', 'SELL'] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn(
              'py-2 rounded-md font-semibold text-sm transition',
              side === s
                ? s === 'BUY' ? 'bg-up text-black' : 'bg-down text-white'
                : 'text-muted',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Order type */}
      <div className="flex gap-2 mb-4 text-xs">
        {(['MARKET', 'LIMIT', 'STOP_LIMIT'] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={cn('px-2 py-1 rounded', type === t ? 'bg-bg-hover text-gold' : 'text-muted')}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {type !== 'MARKET' && (
          <Field label={`Price (${pair.quote})`}>
            <input className="input" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder={fmtPrice(lastPrice, pair.pricePrecision)} inputMode="decimal" />
          </Field>
        )}
        <Field label={`Amount (${pair.base})`}>
          <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00" inputMode="decimal" />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Stop loss">
            <input className="input" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="—" inputMode="decimal" />
          </Field>
          <Field label="Take profit">
            <input className="input" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="—" inputMode="decimal" />
          </Field>
        </div>

        <div className="flex justify-between text-xs text-muted pt-1">
          <span>Total</span>
          <span className="tabular-nums">{fmtPrice(total)} {pair.quote}</span>
        </div>
        {user && (
          <div className="flex justify-between text-xs text-muted">
            <span>Available</span>
            <span className="tabular-nums">{fmtPrice(user.balance ?? 0)} USDT</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className={cn(
            'w-full py-2.5 rounded-lg font-semibold transition disabled:opacity-50',
            side === 'BUY' ? 'bg-up text-black' : 'bg-down text-white',
          )}
        >
          {busy ? 'Placing…' : `${side} ${pair.base}`}
        </button>

        {msg && <p className="text-xs text-center text-muted">{msg}</p>}
        <p className="text-[10px] text-center text-muted">Trading involves risk. Review your order before placing.</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted mb-1 block">{label}</span>
      {children}
    </label>
  );
}
