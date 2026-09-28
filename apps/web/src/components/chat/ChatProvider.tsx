'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { auth, db } from './firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { getUserDoc, AppUser } from '@/lib/fb';

interface ChatMessage {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  text: string;
  timestamp: any;
  read: boolean;
  type: 'user' | 'support';
  replyToUid?: string;
  replyToName?: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  unreadCount: number;
  sendMessage: (text: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  isOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  user: User | null;
  appUser: AppUser | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const unsubRefs = useRef<Array<() => void>>([]);

  // Load auth user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const userData = await getUserDoc(u.uid);
        setAppUser(userData);
      } else {
        setAppUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ Listen to TWO queries: own messages + support replies addressed to me
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    console.log('🟡 ChatProvider: Setting up listeners for user:', user.uid);

    // Bucket to hold docs from both queries, keyed by doc id (dedupes safely)
    const store = new Map<string, ChatMessage>();

    const publish = () => {
      const list = Array.from(store.values()).sort((a, b) => {
        const ta = a.timestamp?.toMillis?.() ?? 0;
        const tb = b.timestamp?.toMillis?.() ?? 0;
        return ta - tb;
      });
      setMessages(list);
      const unread = list.filter((m) => m.type === 'support' && !m.read).length;
      setUnreadCount(unread);
      if (isOpen && unread > 0) {
        markAsRead();
      }
    };

    const handle = (snapshot: any, source: 'own' | 'reply') => {
      snapshot.docChanges().forEach((change: any) => {
        const id = change.doc.id;
        if (change.type === 'removed') {
          store.delete(id);
        } else {
          store.set(id, { id, ...(change.doc.data() as any) });
        }
      });
      console.log(`📨 ${source} snapshot: size=${snapshot.size}, store=${store.size}`);
      publish();
    };

    // Query 1 — messages I sent
    const q1 = query(
      collection(db, 'chats'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    // Query 2 — support replies addressed to me
    const q2 = query(
      collection(db, 'chats'),
      where('replyToUid', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsub1 = onSnapshot(q1, (s) => handle(s, 'own'), (err) => {
      console.error('❌ own query error:', err.code, err.message);
    });

    const unsub2 = onSnapshot(q2, (s) => handle(s, 'reply'), (err) => {
      console.error('❌ reply query error:', err.code, err.message);
    });

    unsubRefs.current = [unsub1, unsub2];

    return () => {
      unsubRefs.current.forEach((fn) => fn());
      unsubRefs.current = [];
    };
  }, [user, isOpen]);

  const sendMessage = async (text: string) => {
    if (!user) throw new Error('Please log in to chat');
    if (!text.trim()) return;

    const displayName = appUser?.displayName || user.displayName || user.email?.split('@')[0] || 'Trader';

    await addDoc(collection(db, 'chats'), {
      uid: user.uid,
      email: user.email || 'anonymous',
      displayName,
      text: text.trim(),
      timestamp: serverTimestamp(),
      read: false,
      type: 'user',
    });
  };

  const markAsRead = async () => {
    if (!user) return;
    try {
      // Mark support replies addressed to me as read
      const q = query(
        collection(db, 'chats'),
        where('replyToUid', '==', user.uid),
        where('type', '==', 'support'),
        where('read', '==', false)
      );
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((d) => updateDoc(doc(db, 'chats', d.id), { read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('❌ markAsRead error:', err);
    }
  };

  const toggleChat = () => setIsOpen((v) => !v);
  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  return (
    <ChatContext.Provider
      value={{
        messages,
        unreadCount,
        sendMessage,
        markAsRead,
        isOpen,
        toggleChat,
        openChat,
        closeChat,
        user,
        appUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}