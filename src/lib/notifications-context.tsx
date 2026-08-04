import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AppNotification } from "./types";
import { useAuth } from "./auth-context";

type NotificationsContextValue = {
  /** Notifications visible to the current user */
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const STORAGE_KEY = "nucleus_notifications";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [all, setAll] = useState<AppNotification[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAll(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const save = useCallback((notifs: AppNotification[]) => {
    setAll(notifs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
  }, []);

  // Filter to what the current user should see
  const visible = all.filter((n) => {
    if (!user) return false;
    if (n.targetRole === user.role) {
      // Role-wide notifications go to every user of that role
      if (!n.targetUserId) return true;
      // Or only to a specific user
      return n.targetUserId === user.id;
    }
    return false;
  });

  const unreadCount = visible.filter((n) => !n.read).length;

  const push = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
      const notif: AppNotification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      save([...all, notif]);
    },
    [all, save],
  );

  const markRead = useCallback(
    (id: string) => {
      save(all.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
    [all, save],
  );

  const markAllRead = useCallback(() => {
    save(all.map((n) => ({ ...n, read: true })));
  }, [all, save]);

  return (
    <NotificationsContext.Provider
      value={{ notifications: visible, unreadCount, push, markRead, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be inside <NotificationsProvider>");
  return ctx;
}
