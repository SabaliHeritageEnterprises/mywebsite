'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '@/components/firebase';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';
import { onTickers } from '@/lib/ws';
import { 
  ensureUserDoc, listenUserDoc, heartbeat, markOnline,
  listenUserTrades, listenUserPositions, listenUserOrders, listenUserBalance
} from '@/lib/fb';
import type { Ticker } from '@/lib/types';
import { ChatProvider, ChatWidget } from '@/components/chat';  // ← ADD THIS

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAuth((s) => s.setUser);
  const setInitialized = useAuth((s) => s.setInitialized);
  const setTradeHistory = useAuth((s) => s.setTradeHistory);
  const setPositions = useAuth((s) => s.setPositions);
  const setOrders = useAuth((s) => s.setOrders);
  const setBalance = useAuth((s) => s.setBalance);
  const setSnapshot = useMarket((s) => s.setSnapshot);

  // Market data - receives array of Tickers, passes directly to setSnapshot
  useEffect(() => {
    return onTickers((tickerArray: Ticker[]) => {
      setSnapshot(tickerArray);
    });
  }, [setSnapshot]);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let unsubTrades: (() => void) | null = null;
    let unsubPositions: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubBalance: (() => void) | null = null;
    let hb: ReturnType<typeof setInterval> | null = null;
    let currentUid: string | null = null;

    setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      // Clean up previous listeners
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (unsubTrades) { unsubTrades(); unsubTrades = null; }
      if (unsubPositions) { unsubPositions(); unsubPositions = null; }
      if (unsubOrders) { unsubOrders(); unsubOrders = null; }
      if (unsubBalance) { unsubBalance(); unsubBalance = null; }
      if (hb) { clearInterval(hb); hb = null; }

      if (!fbUser) {
        currentUid = null;
        setUser(null);
        setInitialized(true);
        setTradeHistory([]);
        setPositions([]);
        setOrders([]);
        return;
      }

      currentUid = fbUser.uid;
      await ensureUserDoc(fbUser);
      await markOnline(fbUser.uid, true);

      // Live-sync user document
      unsubDoc = listenUserDoc(fbUser.uid, (u) => { 
        setUser(u); 
        setInitialized(true);
      });
      
      // Live-sync user trades (real-time)
      unsubTrades = listenUserTrades(fbUser.uid, (trades) => {
        setTradeHistory(trades);
        console.log('📊 Real-time trade update:', trades.length, 'trades');
      });
      
      // Live-sync user positions (real-time)
      unsubPositions = listenUserPositions(fbUser.uid, (positions) => {
        setPositions(positions);
        console.log('📈 Real-time positions update:', positions.length, 'positions');
      });
      
      // Live-sync user orders (real-time)
      unsubOrders = listenUserOrders(fbUser.uid, (orders) => {
        setOrders(orders);
        console.log('📋 Real-time orders update:', orders.length, 'orders');
      });
      
      // Live-sync user balance (real-time)
      unsubBalance = listenUserBalance(fbUser.uid, (balance) => {
        setBalance(balance);
        console.log('💰 Real-time balance update: $' + balance.toFixed(2));
      });
      
      hb = setInterval(() => heartbeat(fbUser.uid), 20_000);
    });

    const onUnload = () => { if (currentUid) markOnline(currentUid, false); };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
      if (unsubTrades) unsubTrades();
      if (unsubPositions) unsubPositions();
      if (unsubOrders) unsubOrders();
      if (unsubBalance) unsubBalance();
      if (hb) clearInterval(hb);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [setUser, setInitialized, setTradeHistory, setPositions, setOrders, setBalance]);

  // Wrap everything with ChatProvider and add ChatWidget
  return (
    <ChatProvider>
      {children}
      <ChatWidget />
    </ChatProvider>
  );
}