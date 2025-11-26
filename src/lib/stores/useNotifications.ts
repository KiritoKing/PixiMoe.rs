import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";
import type { Notification, NotificationType } from "@/types";

interface NotificationState {
  notifications: Notification[];
  isOpen: boolean;
  filter: NotificationType | "all";

  // Actions
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "read"> & {
      pinned?: boolean;
    },
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setOpen: (open: boolean) => void;
  setFilter: (filter: NotificationType | "all") => void;

  // Persistence
  loadFromStore: () => Promise<void>;
  saveToStore: () => Promise<void>;
}

const MAX_NOTIFICATIONS = 100;
const CLEANUP_AGE_DAYS = 7;
const CLEANUP_AGE_MS = CLEANUP_AGE_DAYS * 24 * 60 * 60 * 1000;

let storeInstance: Store | null = null;

const getStore = async (): Promise<Store> => {
  if (!storeInstance) {
    storeInstance = await Store.load("notifications.dat");
  }
  return storeInstance;
};

const cleanupOldNotifications = (
  notifications: Notification[],
): Notification[] => {
  const now = Date.now();
  return notifications.filter((n) => {
    // Keep pinned notifications
    if (n.pinned) return true;
    // Remove notifications older than CLEANUP_AGE_DAYS
    return now - n.timestamp < CLEANUP_AGE_MS;
  });
};

const limitNotifications = (notifications: Notification[]): Notification[] => {
  // Keep pinned notifications first, then most recent
  const pinned = notifications.filter((n) => n.pinned);
  const unpinned = notifications
    .filter((n) => !n.pinned)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_NOTIFICATIONS - pinned.length);

  return [...pinned, ...unpinned];
};

export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: [],
  isOpen: false,
  filter: "all",

  addNotification: (notificationData) => {
    const notification: Notification = {
      ...notificationData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
      pinned: notificationData.pinned || false,
    };

    set((state) => {
      const updated = [notification, ...state.notifications];
      const cleaned = cleanupOldNotifications(updated);
      const limited = limitNotifications(cleaned);
      return { notifications: limited };
    });

    // Save to store asynchronously
    get().saveToStore();
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    get().saveToStore();
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    get().saveToStore();
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
    get().saveToStore();
  },

  clearAll: () => {
    set({ notifications: [] });
    get().saveToStore();
  },

  setOpen: (open) => {
    set({ isOpen: open });
    // Auto-mark as read when opening
    if (open) {
      get().markAllAsRead();
    }
  },

  setFilter: (filter) => {
    set({ filter });
  },

  loadFromStore: async () => {
    try {
      const store = await getStore();
      const stored = await store.get<Notification[]>("notifications");
      if (stored) {
        const cleaned = cleanupOldNotifications(stored);
        const limited = limitNotifications(cleaned);
        set({ notifications: limited });
      }
    } catch (error) {
      console.error("Failed to load notifications from store:", error);
    }
  },

  saveToStore: async () => {
    try {
      const store = await getStore();
      const { notifications } = get();
      await store.set("notifications", notifications);
      await store.save();
    } catch (error) {
      console.error("Failed to save notifications to store:", error);
    }
  },
}));
