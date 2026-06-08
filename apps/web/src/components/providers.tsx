'use client';

import { useEffect } from 'react';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '@/components/firebase';
import { useAuth } from '@/store/auth';
import { useMarket } from '@/store/market';
import { onTickers } from '@/lib/ws';
import { ensureUserDoc, listenUserDoc, heartbeat, markOnline } from '@/lib/fb';

/**
 * App-wide client providers:
 *  - Firebase session persistence + auth-state subscription
 *  - live sync of the signed-in user's Firestore document (role/balance/status)
 *  - presence heartbeat so the admin dashboard sees accurate online/offline
 *  - market ticker stream (optional; from the market feed if running)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAuth((s) => s.setUser);
  const setInitialized = useAuth((s) => s.setInitialized);
  const setSnapshot = useMarket((s) => s.setSnapshot);

  // Market data (public) — harmless if the feed isn't running.
  useEffect(() => onTickers(setSnapshot), [setSnapshot]);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let hb: ReturnType<typeof setInterval> | null = null;
    let currentUid: string | null = null;

    setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      // tear down previous user's listeners
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

      // live-sync the user doc → store (admin edits show up here automatically)
      unsubDoc = listenUserDoc(fbUser.uid, (u) => { setUser(u); setInitialized(true); });

      // presence heartbeat every 20s (admin treats >60s stale as offline)
      hb = setInterval(() => heartbeat(fbUser.uid), 20_000);
    });

    // best-effort offline flag when the tab closes
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
