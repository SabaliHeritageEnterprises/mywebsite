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
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Use your existing Firebase auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const userData = await getUserDoc(user.uid);
        setAppUser(userData);
      } else {
        setAppUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for messages in real-time from Firestore
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: ChatMessage[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const msg = { id: doc.id, ...data } as ChatMessage;
        newMessages.push(msg);

        if (data.type === 'support' && data.uid === user.uid && !data.read) {
          unread++;
        }
      });

      setMessages(newMessages);
      setUnreadCount(unread);

      if (isOpen && unread > 0) {
        markAsRead();
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user, isOpen]);

  const sendMessage = async (text: string) => {
    if (!user) throw new Error('Please log in to chat');
    if (!text.trim()) return;

    const displayName = appUser?.displayName || user.displayName || user.email?.split('@')[0] || 'Trader';

    await addDoc(collection(db, 'chats'), {
      uid: user.uid,
      email: user.email || 'anonymous',
      displayName: displayName,
      text: text.trim(),
      timestamp: serverTimestamp(),
      read: false,
      type: 'user'
    });
  };

  const markAsRead = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'chats'),
        where('uid', '==', user.uid),
        where('type', '==', 'support'),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map((docSnap) =>
        updateDoc(doc(db, 'chats', docSnap.id), { read: true })
      );

      await Promise.all(updates);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);
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
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}