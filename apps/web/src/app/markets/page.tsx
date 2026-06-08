'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MarketTable } from '@/components/market-table';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { MarketPair, MarketType } from '@/lib/types';
import { Search } from 'lucide-react';

type Tab = 'ALL' | MarketType | 'FAVORITES';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CRYPTO', label: 'Crypto' },
  { key: 'FOREX', label: 'Forex' },
  { key: 'FAVORITES', label: 'Favorites' },
];

export default function MarketsPage() {
  const { user } = useAuth();
  const [pairs, setPairs] = useState<MarketPair[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<MarketPair[]>('/market/pairs').then((r) => setPairs(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get<MarketPair[]>('/watchlist/favorites')
      .then((r) => setFavorites(new Set(r.data.map((p) => p.symbol))))
      .catch(() => {});
  }, [user]);

  const toggleFavorite = async (symbol: string) => {
    if (!user) return alert('Log in to save favorites');
    try {
      const { data } = await api.post<{ favorited: boolean }>(`/watchlist/favorites/${symbol}`);
      setFavorites((prev) => {
        const next = new Set(prev);
        data.favorited ? next.add(symbol) : next.delete(symbol);
        return next;
      });
    } catch (e) {
      alert(apiError(e));
    }
  };

  const filtered = useMemo(() => {
    return pairs.filter((p) => {
      if (tab === 'CRYPTO' && p.type !== 'CRYPTO') return false;
      if (tab === 'FOREX' && p.type !== 'FOREX') return false;
      if (tab === 'FAVORITES' && !favorites.has(p.symbol)) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.symbol.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [pairs, tab, search, favorites]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 w-full flex-1">
        <h1 className="text-3xl font-bold mb-6">Markets</h1>

        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? 'px-4 py-2 rounded-lg bg-gold text-black font-medium text-sm'
                    : 'px-4 py-2 rounded-lg text-muted hover:text-white text-sm'
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search markets…"
              className="input pl-9"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <MarketTable pairs={filtered} favorites={favorites} onToggleFavorite={toggleFavorite} />
        ) : (
          <div className="card p-10 text-center text-muted">No markets match your filters.</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
