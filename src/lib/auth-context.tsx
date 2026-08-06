import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserProfile, Role } from "./types";
import {
  me,
  login as loginFn,
  logout as logoutFn,
  listMembers,
  createMember,
  updateMember,
  removeMember,
} from "./db/auth-fns";

// ─── context shape ────────────────────────────────────────────────────────────
type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  /** Login by email + password — verified server-side against hashed passwords. */
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isOCP: boolean;
  isOCVP: boolean;
  isOC: boolean;
  canSeeWorkspace: (wsId: string) => boolean;
  canEditInWorkspace: (wsId: string) => boolean;
  canSeeKeyArea: (wsId: string, keyAreaId: string) => boolean;
  /** All non-admin members added by admin (loaded from the server). */
  managedUsers: UserProfile[];
  addManagedUser: (u: Omit<UserProfile, "id"> & { password: string }) => Promise<{ error?: string }>;
  removeManagedUser: (id: string) => Promise<void>;
  updateManagedUser: (
    id: string,
    patch: Partial<Omit<UserProfile, "id">> & { newPassword?: string },
  ) => Promise<void>;
  refreshMembers: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toProfile(u: any): UserProfile {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    workspaceId: u.workspaceId ?? null,
    keyAreaId: u.keyAreaId ?? null,
    hue: u.hue ?? 220,
  };
}

// ─── provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [managed, setManaged] = useState<UserProfile[]>([]);

  const refreshMembers = useCallback(() => {
    listMembers()
      .then((rows) => setManaged((rows as any[]).map(toProfile).filter((u) => u.role !== "admin")))
      .catch(() => setManaged([]));
  }, []);

  // Restore the session from the server-verified sealed cookie.
  useEffect(() => {
    me()
      .then((u) => {
        if (u) {
          setUser(toProfile(u));
          refreshMembers();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshMembers]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await loginFn({ data: { email: email.trim(), password } });
        if ((res as any).error) return { error: (res as any).error };
        const u = (res as any).user;
        setUser(toProfile(u));
        refreshMembers();
        return {};
      } catch {
        return { error: "Sign in failed. Please try again." };
      }
    },
    [refreshMembers],
  );

  const logout = useCallback(() => {
    logoutFn().catch(() => {});
    setUser(null);
    setManaged([]);
  }, []);

  const isAdmin = user?.role === "admin";
  const isOCP = user?.role === "ocp";
  const isOCVP = user?.role === "ocvp";
  const isOC = user?.role === "oc";

  const canSeeWorkspace = useCallback(
    (wsId: string) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return user.workspaceId === wsId;
    },
    [user],
  );

  const canEditInWorkspace = useCallback(
    (wsId: string) => {
      if (!user) return false;
      if (user.role === "admin" || user.role === "ocp") return true;
      if (user.role === "ocvp") return user.workspaceId === wsId;
      return user.workspaceId === wsId;
    },
    [user],
  );

  const canSeeKeyArea = useCallback(
    (wsId: string, keyAreaId: string) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      if (!canSeeWorkspace(wsId)) return false;
      if (user.role === "ocp" || user.role === "ocvp") return true;
      return user.keyAreaId === keyAreaId;
    },
    [user, canSeeWorkspace],
  );

  const addManagedUser = useCallback(
    async (u: Omit<UserProfile, "id"> & { password: string }) => {
      const res = await createMember({
        data: {
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          workspaceId: u.workspaceId ?? null,
          keyAreaId: u.keyAreaId ?? null,
          hue: u.hue,
        },
      });
      if ((res as any).error) return { error: (res as any).error };
      refreshMembers();
      return {};
    },
    [refreshMembers],
  );

  const removeManagedUser = useCallback(
    async (id: string) => {
      await removeMember({ data: { id } }).catch(() => {});
      refreshMembers();
    },
    [refreshMembers],
  );

  const updateManagedUser = useCallback(
    async (id: string, patch: Partial<Omit<UserProfile, "id">> & { newPassword?: string }) => {
      await updateMember({
        data: {
          id,
          role: patch.role,
          workspaceId: patch.workspaceId,
          keyAreaId: patch.keyAreaId,
          newPassword: patch.newPassword,
        },
      }).catch(() => {});
      refreshMembers();
    },
    [refreshMembers],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isOCP,
        isOCVP,
        isOC,
        canSeeWorkspace,
        canEditInWorkspace,
        canSeeKeyArea,
        managedUsers: managed,
        addManagedUser,
        removeManagedUser,
        updateManagedUser,
        refreshMembers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}

export function roleLabel(role: Role): string {
  return { admin: "Admin", ocp: "OCP", ocvp: "OCVP", oc: "OC" }[role];
}
