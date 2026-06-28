'use client';

import { useState } from 'react';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';
import { fmtPrice, cn } from '@/lib/utils';
import { saveUserTrade, saveUserPosition, saveUserOrder, updateUserBalance } from '@/lib/fb';
import { auth } from '@/components/firebase';
import type { MarketPair, OrderSide, OrderType } from '@/lib/types';

interface Props {
  pair: MarketPair;
  onPlaced?: () => void;
}

export function OrderPanel({ pair, onPlaced }: Props) {
  const { user, updateBalance, addPosition, addOrder, addTradeHistory, loadUserData } = useAuth();
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
      
      // ─── 1. CALCULATE TRADE COST IN QUOTE CURRENCY (USDT) ──────
      const qty = parseFloat(quantity);
      const price = effectivePrice;
      const tradeCost = qty * price; // This is in USDT
      
      // ─── 2. CHECK IF USER HAS ENOUGH USDT BALANCE ──────────────
      if (tradeCost > user.balance) {
        setMsg(`❌ Insufficient USDT balance! Required: $${tradeCost.toFixed(2)}, Available: $${user.balance.toFixed(2)}`);
        setBusy(false);
        return;
      }
      
      // ─── 3. DEDUCT USDT FROM BALANCE ────────────────────────────
      const balanceAfterDeduction = user.balance - tradeCost;
      
      console.log('📊 Starting trade process...');
      console.log('User ID:', user.uid);
      console.log('Action:', side);
      console.log(`Quantity: ${qty} ${pair.base}`);
      console.log(`Price: $${price.toFixed(2)} ${pair.quote}`);
      console.log(`Trade Cost: $${tradeCost.toFixed(2)} ${pair.quote}`);
      console.log('Balance before:', user.balance);
      console.log('Balance after deduction:', balanceAfterDeduction);
      console.log('Profit to be approved:', increaseAmount);
      
      // ─── 4. UPDATE BALANCE IN FIRESTORE (DEDUCT USDT) ──────────
      await updateUserBalance(user.uid, balanceAfterDeduction);
      console.log('✅ Balance updated in Firestore (deducted USDT)');
      
      // Also update local state
      await updateBalance(balanceAfterDeduction);
      console.log('✅ Balance updated in local state');
      
      const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // ─── 5. SAVE TRADE AS PENDING ────────────────────────────────
      const tradeData = {
        id: tradeId,
        symbol: pair.symbol,
        side: side,
        type: type,
        price: price,
        quantity: qty,
        total: tradeCost, // Total in USDT
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        pnl: increaseAmount,
        percentageGain: randomPercent,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        userId: user.uid,
        userEmail: user.email,
        userDisplayName: user.displayName || user.email?.split('@')[0] || 'Trader',
      };
      
      // Save to Firestore as PENDING
      await saveUserTrade(user.uid, tradeData);
      console.log('✅ Trade saved as PENDING:', tradeId);
      
      // Also save to local state as PENDING
      await addTradeHistory(tradeData);
      console.log('✅ Trade saved to local state as PENDING');
      
      // ─── 6. SAVE ORDER ────────────────────────────────────────────────
      const orderData = {
        id: orderId,
        symbol: pair.symbol,
        side: side,
        type: type,
        price: price,
        quantity: qty,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
      };
      
      await saveUserOrder(user.uid, orderData);
      console.log('✅ Order saved to Firestore:', orderId);
      
      await addOrder(orderData);
      console.log('✅ Order saved to local state');
      
      // ─── 7. SAVE POSITION (if BUY) ────────────────────────────────────
      if (side === 'BUY') {
        const posId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const positionData = {
          id: posId,
          symbol: pair.symbol,
          side: side,
          entryPrice: price,
          quantity: qty,
          currentPrice: price,
          pnl: 0,
          openTime: new Date().toISOString(),
          status: 'OPEN' as const,
          approved: false,
        };
        
        await saveUserPosition(user.uid, positionData);
        console.log('✅ Position saved to Firestore:', posId);
        
        await addPosition(positionData);
        console.log('✅ Position saved to local state');
      }
      
      // ─── 8. RELOAD USER DATA ──────────────────────────────────────
      await loadUserData(user.uid);
      console.log('✅ User data reloaded');
      
      setMsg(`✅ ${side} ${qty} ${pair.base} at $${price.toFixed(2)} | Cost: $${tradeCost.toFixed(2)} USDT | Profit pending admin approval.`);
      
      // Call onPlaced callback if provided
      if (onPlaced) {
        onPlaced();
      }
      
      // Optional backend call
      try {
        await api.post('/trades/orders', {
          symbol: pair.symbol,
          side,
          type,
          quantity: qty,
          ...(type !== 'MARKET' ? { price: price } : {}),
          ...(stopLoss ? { stopLoss: parseFloat(stopLoss) } : {}),
          ...(takeProfit ? { takeProfit: parseFloat(takeProfit) } : {}),
        });
      } catch (e) {
        // Ignore backend errors
        console.log('Backend not available (demo mode)');
      }
      
      setQuantity('');
      setPrice('');
    } catch (e) {
      console.error('❌ Trade error:', e);
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
          <div className="block">
            <span className="text-xs text-muted mb-1 block">Price ({pair.quote})</span>
            <input className="input" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder={fmtPrice(lastPrice, pair.pricePrecision)} inputMode="decimal" />
          </div>
        )}
        <div className="block">
          <span className="text-xs text-muted mb-1 block">Amount ({pair.base})</span>
          <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00" inputMode="decimal" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="block">
            <span className="text-xs text-muted mb-1 block">Stop loss</span>
            <input className="input" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="—" inputMode="decimal" />
          </div>
          <div className="block">
            <span className="text-xs text-muted mb-1 block">Take profit</span>
            <input className="input" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="—" inputMode="decimal" />
          </div>
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
          {busy ? 'Processing...' : `${side} ${pair.base}`}
        </button>

        {msg && <p className="text-xs text-center">{msg}</p>}
        <p className="text-[10px] text-center text-muted">Trades require admin approval before profits are added.</p>
      </div>
    </div>
  );
}