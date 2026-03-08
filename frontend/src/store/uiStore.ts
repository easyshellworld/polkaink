import { create } from 'zustand';

interface UIState {
  language: string;
  theme: 'light' | 'dark' | 'system';
  mobileNavOpen: boolean;
  setLanguage: (lng: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  language: 'en',
  theme: 'system',
  mobileNavOpen: false,
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
}));
