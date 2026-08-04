import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserProfile, Role } from "./types";

// ─── hard-coded admin accounts ────────────────────────────────────────────────
const ADMIN_EMAILS = new Set([
  "mehdi.jdidi@aiesec.net",
  "aminetouati@aiesec.net",
  "rayenyahyaoui@aiesec.net",
]);

const ADMIN_PROFILES: UserProfile[] = [
  { id: "admin-mehdi", email: "mehdi.jdidi@aiesec.net", name: "Mehdi Jdidi", role: "admin", workspaceId: null, keyAreaId: null, hue: 260 },
  { id: "admin-amine", email: "aminetouati@aiesec.net", name: "Amine Touati", role: "admin", workspaceId: null, keyAreaId: null, hue: 200 },
  { id: "admin-rayen", email: "rayenyahyaoui@aiesec.net", name: "Rayen Yahyaoui", role: "admin", workspaceId: null, keyAreaId: null, hue: 140 },
];

// ─── context shape ────────────────────────────────────────────────────────────
type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  /** Login by email only — no password required */
  login: (email: string) => Promise<{ error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isOCP: boolean;
  isOCVP: boolean;
  isOC: boolean;
  canSeeWorkspace: (wsId: string) => boolean;
  canEditInWorkspace: (wsId: string) => boolean;
  canSeeKeyArea: (wsId: string, keyAreaId: string) => boolean;
  /** All non-admin members added by admin */
  managedUsers: UserProfile[];
  addManagedUser: (u: Omit<UserProfile, "id">) => void;
  removeManagedUser: (id: string) => void;
  updateManagedUser: (id: string, patch: Partial<Omit<UserProfile, "id">>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "cupola_session";
const MANAGED_KEY = "cupola_managed_users";
const MANAGED_VERSION_KEY = "cupola_managed_version";
const CURRENT_MANAGED_VERSION = "2";

// ─── provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [managed, setManaged] = useState<UserProfile[]>([]);

  useEffect(() => {
    try {
      const sess = localStorage.getItem(SESSION_KEY);
      if (sess) setUser(JSON.parse(sess));
      const storedVersion = localStorage.getItem(MANAGED_VERSION_KEY);
      if (storedVersion !== CURRENT_MANAGED_VERSION) {
        localStorage.removeItem(MANAGED_KEY);
        localStorage.removeItem("cupola_deleted_static_ids");
        localStorage.setItem(MANAGED_VERSION_KEY, CURRENT_MANAGED_VERSION);
      } else {
        const mu = localStorage.getItem(MANAGED_KEY);
        if (mu) setManaged(JSON.parse(mu));
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string): Promise<{ error?: string }> => {
      const e = email.toLowerCase().trim();

      if (ADMIN_EMAILS.has(e)) {
        const profile = ADMIN_PROFILES.find((a) => a.email === e)!;
        setUser(profile);
        localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
        return {};
      }

      const found = managed.find((u) => u.email.toLowerCase() === e);
      if (!found) return { error: "No account found for this email." };

      setUser(found);
      localStorage.setItem(SESSION_KEY, JSON.stringify(found));
      return {};
    },
    [managed],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
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
    (u: Omit<UserProfile, "id">) => {
      const withId: UserProfile = { ...u, id: `mu-${Date.now()}` };
      const updated = [...managed, withId];
      setManaged(updated);
      localStorage.setItem(MANAGED_KEY, JSON.stringify(updated));
    },
    [managed],
  );

  const removeManagedUser = useCallback(
    (id: string) => {
      const updated = managed.filter((u) => u.id !== id);
      setManaged(updated);
      localStorage.setItem(MANAGED_KEY, JSON.stringify(updated));
    },
    [managed],
  );

  const updateManagedUser = useCallback(
    (id: string, patch: Partial<Omit<UserProfile, "id">>) => {
      const updated = managed.map((u) => (u.id === id ? { ...u, ...patch } : u));
      setManaged(updated);
      localStorage.setItem(MANAGED_KEY, JSON.stringify(updated));
    },
    [managed],
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
