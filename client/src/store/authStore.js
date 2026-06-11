import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,
      isRefreshingUser: false,
      authError: null,
      setSession: ({ user, token }) => set({ user, token, authError: null, isRefreshingUser: false }),
      setUser: (user) => set({ user, authError: null, isRefreshingUser: false }),
      setAuthHydrated: (hasHydrated) => set({ hasHydrated }),
      setAuthRefreshing: (isRefreshingUser) => set({ isRefreshingUser }),
      setAuthError: (authError) => set({ authError, isRefreshingUser: false }),
      clearSession: () => set({ user: null, token: null, authError: null, isRefreshingUser: false })
    }),
    {
      name: "supanova-session",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("[auth] Failed to hydrate persisted session", error);
        state?.setAuthHydrated(true);
      }
    }
  )
);
