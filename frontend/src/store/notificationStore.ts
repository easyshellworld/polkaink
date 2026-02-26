import { create } from 'zustand';

export interface TxNotification {
  id: string;
  type: 'pending' | 'success' | 'error';
  message: string;
  txHash?: string;
  timestamp: number;
}

interface NotificationState {
  notifications: TxNotification[];
  addNotification: (n: Omit<TxNotification, 'timestamp'>) => void;
  updateNotification: (id: string, updates: Partial<TxNotification>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (n) =>
    set((s) => ({
      notifications: [...s.notifications, { ...n, timestamp: Date.now() }],
    })),
  updateNotification: (id, updates) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
  clearAll: () => set({ notifications: [] }),
}));
