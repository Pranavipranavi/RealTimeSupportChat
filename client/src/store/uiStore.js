import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUiStore = create(
  persist(
    (set) => ({
      theme: "dark",
      sidebarOpen: false,
      toasts: [],
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      pushToast: (toast) => set((state) => ({ toasts: [...state.toasts, { id: crypto.randomUUID(), ...toast }] })),
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
    }),
    { name: "supportflow-ui", partialize: (state) => ({ theme: state.theme }) }
  )
);
