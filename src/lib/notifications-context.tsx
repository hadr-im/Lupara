import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AppNotification } from "./types";
import { useAuth } from "./auth-context";
import {
  getNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from "./db/server-fns";

type NotificationsContextValue = {
  /** Notifications visible to the current user */
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Re-fetch from the server (also runs automatically on login & window focus) */
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Load the current user's notifications from the database. This is what makes
  // notifications reach any account on any device — they're stored server-side,
  // not in this browser's localStorage.
  const refresh = useCallback(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    getNotifications({
      data: { userId: user.id, role: user.role, workspaceId: user.workspaceId ?? null },
    })
      .then((rows) => setNotifications(rows as AppNotification[]))
      .catch(() => {
        /* keep whatever we already have on transient errors */
      });
  }, [user]);

  // Refetch when the user changes (login/logout) and whenever the window regains
  // focus, so an open session picks up notifications created elsewhere.
  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isForCurrentUser = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
      if (!user) return false;
      if (n.targetUserId) return n.targetUserId === user.id;
      if (n.targetRole !== user.role) return false;
      if (user.role === "admin") return true;
      return user.workspaceId === n.workspaceId;
    },
    [user],
  );

  const push = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
      const notif: AppNotification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      // Optimistically show it if the current user is a recipient (e.g. an admin
      // broadcasting to their own role); the actual delivery is the DB insert.
      if (isForCurrentUser(n)) {
        setNotifications((prev) => [notif, ...prev]);
      }
      addNotification({
        data: {
          id: notif.id,
          type: n.type,
          title: n.title,
          message: n.message,
          leadId: n.leadId ?? null,
          taskId: n.taskId ?? null,
          targetRole: n.targetRole ?? null,
          targetUserId: n.targetUserId ?? null,
          workspaceId: n.workspaceId,
        },
      }).catch(() => {
        /* fire-and-forget; optimistic state already reflects it locally */
      });
    },
    [isForCurrentUser],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markNotificationRead({ data: { id } }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user) {
      markAllNotificationsRead({
        data: { userId: user.id, role: user.role, workspaceId: user.workspaceId ?? null },
      }).catch(() => {});
    }
  }, [user]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, push, markRead, markAllRead, refresh }}
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
