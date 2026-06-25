'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/components/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  where,
  getDocs
} from 'firebase/firestore';

interface Message {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  text: string;
  timestamp: any;
  read: boolean;
  type: 'user' | 'support';
}

export default function AdminChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      console.log('👤 Auth state changed:', user?.email);
      setUser(user);
      if (user) {
        const checkAdminStatus = async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();
            console.log('👤 User role:', userData?.role);
            setIsAdmin(userData?.role === 'admin' || userData?.role === 'super_admin');
          } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
          }
          setLoading(false);
        };
        checkAdminStatus();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) {
      console.log('⛔ Not listening: user=', !!user, 'isAdmin=', isAdmin);
      return;
    }

    console.log('🔍 Setting up Firestore listener for chats...');

    const q = query(
      collection(db, 'chats'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(
      q, 
      (snapshot) => {
        console.log('📨 Snapshot received! Size:', snapshot.size);
        const msgs: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📄 Document data:', data);
          msgs.push({ id: doc.id, ...data } as Message);
        });
        console.log('📨 Total messages:', msgs.length);
        setMessages(msgs);
      },
      (error) => {
        console.error('❌ Snapshot listener error:', error);
      }
    );

    return () => {
      console.log('🧹 Cleaning up chat listener');
      unsub();
    };
  }, [user, isAdmin]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    try {
      const docRef = await addDoc(collection(db, 'chats'), {
        uid: user.uid,
        email: user.email || 'support@apextrade.com',
        displayName: 'Support',
        text: input.trim(),
        timestamp: serverTimestamp(),
        read: false,
        type: 'support'
      });
      console.log('✅ Reply sent, ID:', docRef.id);
      setInput('');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply. Please try again.');
    }
  };

  const markUserMessagesAsRead = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'chats'),
        where('uid', '==', userId),
        where('type', '==', 'user'),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map((docSnap) =>
        updateDoc(doc(db, 'chats', docSnap.id), { read: true })
      );
      await Promise.all(updates);
      console.log(`✅ Marked ${updates.length} messages as read for user ${userId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        Loading chat...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        You don't have permission to view this page.
      </div>
    );
  }

  // Group messages by user
  const userGroups = messages.reduce((acc, msg) => {
    if (msg.type === 'user') {
      if (!acc[msg.uid]) {
        acc[msg.uid] = [];
      }
      acc[msg.uid].push(msg);
    }
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User List */}
        <div className="bg-[#15181d] rounded-xl border border-[#23272f] p-4 max-h-[500px] overflow-y-auto">
          <h2 className="font-semibold text-sm text-gray-400 mb-3">
            Users ({Object.keys(userGroups).length})
          </h2>
          {Object.keys(userGroups).length === 0 ? (
            <p className="text-gray-500 text-sm">No users have messaged yet.</p>
          ) : (
            Object.entries(userGroups).map(([uid, userMessages]) => {
              const unreadCount = userMessages.filter(m => !m.read).length;
              const lastMsg = userMessages[userMessages.length - 1];
              return (
                <div
                  key={uid}
                  className={`p-3 rounded-lg mb-2 cursor-pointer hover:bg-[#23272f] transition-colors ${
                    unreadCount > 0 ? 'border-l-2 border-yellow-500' : ''
                  }`}
                  onClick={() => markUserMessagesAsRead(uid)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-white">
                      {lastMsg?.displayName || lastMsg?.email || 'Unknown'}
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-yellow-500 text-black text-xs rounded-full px-2 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {lastMsg?.text || 'No messages'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {lastMsg?.timestamp?.toDate?.()?.toLocaleString() || ''}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 bg-[#15181d] rounded-xl border border-[#23272f] p-4 max-h-[500px] overflow-y-auto">
          <h2 className="font-semibold text-sm text-gray-400 mb-3">
            All Messages ({messages.length})
          </h2>
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No messages yet</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="mb-3 p-3 bg-[#0a0b0d] rounded-lg border border-[#23272f]">
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${
                    msg.type === 'support' ? 'text-yellow-500' : 'text-blue-400'
                  }`}>
                    {msg.type === 'support' ? '🟡 Support' : `👤 ${msg.displayName || msg.email}`}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {msg.timestamp?.toDate?.()?.toLocaleString() || 'Just now'}
                  </span>
                </div>
                <div className="mt-1 text-white text-sm">{msg.text}</div>
                <div className="mt-1 flex gap-2">
                  {msg.type === 'user' && !msg.read && (
                    <span className="text-xs text-yellow-500">🟡 Unread</span>
                  )}
                  <span className="text-xs text-gray-600">
                    ID: {msg.uid?.slice(0, 8)}...
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reply Input */}
      <div className="bg-[#15181d] rounded-xl border border-[#23272f] p-4">
        <form onSubmit={handleReply} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type reply to all users..."
            className="flex-1 bg-[#0a0b0d] border border-[#23272f] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Reply to All
          </button>
        </form>
      </div>
    </div>
  );
}