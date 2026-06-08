'use client';

import { create } from 'zustand';
import { fbRegister, fbLogin, fbLogout, fbResetPassword, type AppUser } from '@/lib/fb';

interface AuthState {
  user: AppUser | null;
  initialized: boolean;
  loading: boolean;
  setUser: (u: AppUser | null) => void;
  setInitialized: (v: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

/**
 * Firebase-backed auth state. The live user document (role, balance, status) is
 * kept in sync by the onAuthStateChanged + onSnapshot listeners in <Providers/>,
 * so admin edits propagate here automatically.
 */
export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  loading: false,

  setUser: (u) => set({ user: u }),
  setInitialized: (v) => set({ initialized: v }),

  login: async (email, password) => {
    set({ loading: true });
    try {
      await fbLogin(email, password);
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true });
    try {
      await fbRegister(email, password, displayName);
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    const u = get().user;
    await fbLogout(u?.uid, u?.email);
    set({ user: null });
  },

  resetPassword: async (email) => {
    await fbResetPassword(email);
  },
}));
