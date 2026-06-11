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

export function OrderPanel({ pair, onPlaced }: Props) {
  const { user, updateBalance, addPosition, addOrder, addTradeHistory } = useAuth();
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

  const getRandomPercentage = () => {
    return Math.floor(Math.random() * (25 - 10 + 1) + 10);
  };

  const submit = async () => {
    setMsg(null);
    if (!user) { setMsg('Please log in to trade.'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { setMsg('Enter a quantity.'); return; }
    
    setBusy(true);
    
    try {
      const randomPercent = getRandomPercentage();
      const increaseAmount = user.balance * (randomPercent / 100);
      const newBalance = user.balance + increaseAmount;
      
      // Update user balance in Firebase
      await updateBalance(newBalance);
      
      // Create trade record for history
      const tradeRecord = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: pair.symbol,
        side: side,
        type: type,
        price: effectivePrice,
        quantity: parseFloat(quantity),
        total: total,
        timestamp: new Date().toISOString(),
        status: 'FILLED',
        pnl: increaseAmount,
        percentageGain: randomPercent,
      };
      await addTradeHistory(tradeRecord);
      
      // Create order record
      const orderRecord = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: pair.symbol,
        side: side,
        type: type,
        price: effectivePrice,
        quantity: parseFloat(quantity),
        status: 'FILLED',
        createdAt: new Date().toISOString(),
      };
      await addOrder(orderRecord);
      
      // Create position if BUY
      if (side === 'BUY') {
        const position = {
          id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: pair.symbol,
          side: side,
          entryPrice: effectivePrice,
          quantity: parseFloat(quantity),
          currentPrice: effectivePrice,
          pnl: 0,
          openTime: new Date().toISOString(),
          status: 'OPEN' as const,
        };
        await addPosition(position);
      } else if (side === 'SELL') {
        // For SELL, check if there's an open position to close
        // This would close the corresponding BUY position
        // For demo purposes, we'll just show a message
        setMsg(`✓ SELL order executed! Balance increased by ${randomPercent}% (+$${increaseAmount.toFixed(2)})`);
      }
      
      setMsg(`✓ ${side} order executed! Balance increased by ${randomPercent}% (+$${increaseAmount.toFixed(2)})`);
      
      // Also try to send to backend if available
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
      } catch (e) {
        // Ignore backend errors for demo
        console.log('Demo mode: backend not required');
      }
      
      setQuantity('');
      setPrice('');
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

        {/* Demo mode indicator */}
        <div className="text-center text-[10px] text-gold/70 mb-1">
          🧪 Demo Mode: Each trade increases balance by 10-25%
        </div>

        <button
          onClick={submit}
          disabled={busy}
          className={cn(
            'w-full py-2.5 rounded-lg font-semibold transition disabled:opacity-50',
            side === 'BUY' ? 'bg-up text-black' : 'bg-down text-white',
          )}
        >
          {busy ? 'Processing...' : `${side} ${pair.base}`}
        </button>

        {msg && <p className="text-xs text-center text-up">{msg}</p>}
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