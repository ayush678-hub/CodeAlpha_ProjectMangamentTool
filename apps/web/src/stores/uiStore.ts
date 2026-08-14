import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  toasts: Toast[];
  activeProjectId: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setActiveProject: (id: string | null) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: true,
      toasts: [],
      activeProjectId: null,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleDarkMode: () =>
        set((s) => {
          const newDark = !s.darkMode;
          document.documentElement.classList.toggle('dark', newDark);
          return { darkMode: newDark };
        }),
      setDarkMode: (dark) => {
        document.documentElement.classList.toggle('dark', dark);
        set({ darkMode: dark });
      },

      addToast: (toast) => {
        const id = String(++toastId);
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        // Auto-dismiss
        const duration = toast.duration ?? 4000;
        if (duration > 0) {
          setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
          }, duration);
        }
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setActiveProject: (id) => set({ activeProjectId: id }),
    }),
    {
      name: 'collabo-ui',
      partialMerge: true,
      onRehydrateStorage: () => (state) => {
        // Apply dark mode class on rehydration
        if (state) {
          document.documentElement.classList.toggle('dark', state.darkMode);
        }
      },
    }
  )
);

// Convenience toast helpers
export const toast = {
  success: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'error', title, message }),
  info: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'info', title, message }),
  warning: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'warning', title, message }),
};
