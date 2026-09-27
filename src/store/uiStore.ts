import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isFullscreen: boolean;
  isShortcutsOpen: boolean;
  toasts: Toast[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleMobileNav: () => void;
  toggleQueue: () => void;
  setQueueOpen: (v: boolean) => void;
  toggleLyrics: () => void;
  setLyricsOpen: (v: boolean) => void;
  toggleFullscreen: () => void;
  setFullscreen: (v: boolean) => void;
  toggleShortcuts: () => void;
  setShortcutsOpen: (v: boolean) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  isQueueOpen: false,
  isLyricsOpen: false,
  isFullscreen: false,
  isShortcutsOpen: false,
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  
  toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
  setQueueOpen: (v) => set({ isQueueOpen: v }),

  toggleLyrics: () => set((s) => ({ isLyricsOpen: !s.isLyricsOpen })),
  setLyricsOpen: (v) => set({ isLyricsOpen: v }),

  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  setFullscreen: (v) => set({ isFullscreen: v }),

  toggleShortcuts: () => set((s) => ({ isShortcutsOpen: !s.isShortcutsOpen })),
  setShortcutsOpen: (v) => set({ isShortcutsOpen: v }),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
