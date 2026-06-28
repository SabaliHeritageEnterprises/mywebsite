'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { db } from '@/components/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { isAdmin } from '@/lib/fb';

interface PendingTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  price: number;
  quantity: number;
  total: number;
  timestamp: string;
  status: string;
  pnl: number;
  percentageGain: number;
  approved: boolean;
  userId: string;
  userEmail: string;
  userDisplayName: string;
}

export default function AdminTrades() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && (!user || !isAdmin(user.role))) {
      router.replace('/dashboard');
    }
  }, [initialized, user, router]);

  useEffect(() => {
    if (!user || !isAdmin(user.role)) return;

    // Listen to all users' trades with status 'PENDING'
    const usersRef = collection(db, 'users');
    const unsub = onSnapshot(usersRef, async (snapshot) => {
      const allPendingTrades: PendingTrade[] = [];
      
      for (const userDoc of snapshot.docs) {
        const uid = userDoc.id;
        const tradesRef = collection(db, 'users', uid, 'trades');
        const tradesQuery = query(
          tradesRef,
          where('status', '==', 'PENDING'),
          orderBy('timestamp', 'desc')
        );
        
        const tradesSnapshot = await getDocs(tradesQuery);
        tradesSnapshot.forEach((doc) => {
          const data = doc.data();
          allPendingTrades.push({
            id: doc.id,
            ...data,
            userId: uid,
          } as PendingTrade);
        });
      }
      
      setPendingTrades(allPendingTrades);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleApprove = async (trade: PendingTrade) => {
    setApproving(trade.id);
    try {
      const userRef = doc(db, 'users', trade.userId);
      const userDoc = await getDoc(userRef);
      const currentBalance = userDoc.data()?.balance || 0;
      const newBalance = currentBalance + trade.pnl;

      // 1. Update user's balance
      await updateDoc(userRef, {
        balance: newBalance
      });

      // 2. Update trade status to APPROVED
      const tradeRef = doc(db, 'users', trade.userId, 'trades', trade.id);
      await updateDoc(tradeRef, {
        status: 'APPROVED',
        approved: true,
        approvedBy: user.uid,
        approvedAt: new Date().toISOString(),
        approvedEmail: user.email
      });

      // 3. Update position if BUY
      if (trade.side === 'BUY') {
        const positionsRef = collection(db, 'users', trade.userId, 'positions');
        const positionsQuery = query(
          positionsRef,
          where('symbol', '==', trade.symbol),
          where('entryPrice', '==', trade.price),
          where('quantity', '==', trade.quantity),
          where('status', '==', 'OPEN')
        );
        const positionsSnapshot = await getDocs(positionsQuery);
        positionsSnapshot.forEach(async (posDoc) => {
          await updateDoc(doc(db, 'users', trade.userId, 'positions', posDoc.id), {
            approved: true,
            approvedAt: new Date().toISOString()
          });
        });
      }

      setPendingTrades(prev => prev.filter(t => t.id !== trade.id));
      console.log('✅ Trade approved successfully');
    } catch (error) {
      console.error('Error approving trade:', error);
      alert('Failed to approve trade. Please try again.');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (trade: PendingTrade) => {
    try {
      const tradeRef = doc(db, 'users', trade.userId, 'trades', trade.id);
      await updateDoc(tradeRef, {
        status: 'REJECTED',
        rejectedBy: user.uid,
        rejectedAt: new Date().toISOString()
      });
      setPendingTrades(prev => prev.filter(t => t.id !== trade.id));
      console.log('✅ Trade rejected');
    } catch (error) {
      console.error('Error rejecting trade:', error);
      alert('Failed to reject trade. Please try again.');
    }
  };

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading pending trades...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">📊 Trade Approvals</h1>
          <span className="text-xs px-3 py-1 rounded bg-yellow-500/20 text-yellow-500">
            {pendingTrades.length} pending
          </span>
        </div>

        {pendingTrades.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-lg">No pending trades to approve.</p>
            <p className="text-sm">All trades have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTrades.map((trade) => (
              <div key={trade.id} className="card p-6 border border-[#23272f] hover:border-gold/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-bold text-lg ${trade.side === 'BUY' ? 'text-up' : 'text-down'}`}>
                        {trade.side}
                      </span>
                      <span className="text-xl font-medium">{trade.symbol}</span>
                      <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500">
                        PENDING
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">User</p>
                        <p className="font-medium">{trade.userDisplayName || trade.userEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="font-medium">{trade.quantity} {trade.symbol.replace(/USDT$/, '')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="font-medium">${trade.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Profit</p>
                        <p className="font-medium text-up">+${trade.pnl.toFixed(2)} ({trade.percentageGain}%)</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="font-medium">${trade.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p className="font-medium text-xs">{new Date(trade.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(trade)}
                      disabled={approving === trade.id}
                      className="bg-green-500 text-black px-4 py-2 rounded-lg font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
                    >
                      {approving === trade.id ? '...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Reject this trade?')) {
                          handleReject(trade);
                        }
                      }}
                      disabled={approving === trade.id}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-400 transition-colors disabled:opacity-50"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}