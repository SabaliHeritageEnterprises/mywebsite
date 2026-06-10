'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '@/components/firebase';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';
import { onTickers } from '@/lib/ws';
import { ensureUserDoc, listenUserDoc, heartbeat, markOnline } from '@/lib/fb';
import type { Ticker } from '@/lib/types';

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAuth((s) => s.setUser);
  const setInitialized = useAuth((s) => s.setInitialized);
  const setSnapshot = useMarket((s) => s.setSnapshot);

  // Market data - receives array of Tickers, passes directly to setSnapshot
  useEffect(() => {
    return onTickers((tickerArray: Ticker[]) => {
      setSnapshot(tickerArray);
    });
  }, [setSnapshot]);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let hb: ReturnType<typeof setInterval> | null = null;
    let currentUid: string | null = null;

    setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (hb) { clearInterval(hb); hb = null; }

      if (!fbUser) {
        currentUid = null;
        setUser(null);
        setInitialized(true);
        return;
      }

      currentUid = fbUser.uid;
      await ensureUserDoc(fbUser);
      await markOnline(fbUser.uid, true);

      unsubDoc = listenUserDoc(fbUser.uid, (u) => { setUser(u); setInitialized(true); });
      hb = setInterval(() => heartbeat(fbUser.uid), 20_000);
    });

    const onUnload = () => { if (currentUid) markOnline(currentUid, false); };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
      if (hb) clearInterval(hb);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [setUser, setInitialized]);

  return <>{children}</>;
}