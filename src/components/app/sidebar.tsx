import { Link, useLocation, useParams, useSearch } from "@tanstack/react-router";
import { CupolaIcon } from "@/components/app/cupola-logo";
import {
  LayoutDashboard,
  TrendingUp,
  Truck,
  Megaphone,
  Globe2,
  FileText,
  Sparkles,
  Settings,
  Users,
  Bell,
  Plus,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  X,
  Activity,
  Shield,
  ChevronRight,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { workspaces } from "@/lib/mock/data";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, roleLabel } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import { Avatar } from "@/components/app/avatar";

const areas = [
  { id: "dxp", name: "DXP / Experience", icon: Sparkles },
  { id: "sales", name: "Sales", icon: TrendingUp },
  { id: "logistics", name: "Logistics", icon: Truck },
  { id: "marketing", name: "Marketing", icon: Megaphone },
  { id: "pr", name: "Public Relations", icon: Globe2 },
  { id: "content", name: "Content", icon: FileText },
];

export function Sidebar() {
  const { user, logout, isAdmin, canSeeWorkspace, canSeeKeyArea } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const loc = useLocation();

  // Read workspace from URL params (works on all /$workspace/* routes)
  const params = useParams({ strict: false }) as { workspace?: string };
  // On /admin, default to pmewa so the Admin section stays highlighted/visible
  const isAdminRoute = loc.pathname === "/admin";
  const currentWorkspace = params.workspace ?? (isAdminRoute ? "pmewa" : (user?.workspaceId ?? "tedx"));

  // Read search params for area highlighting on /tasks
  const search = useSearch({ strict: false }) as { area?: string };

  const visibleWorkspaces = workspaces.filter((w) => canSeeWorkspace(w.id));
  const ws = workspaces.find((w) => w.id === currentWorkspace) ?? workspaces[0];

  // Active state helpers
  const isDashboardActive = loc.pathname === `/${currentWorkspace}` || loc.pathname === `/${currentWorkspace}/`;
  const isSalesActive = loc.pathname === `/${currentWorkspace}/sales`;
  const isTeamActive = loc.pathname === `/${currentWorkspace}/team`;
  const isActivityActive = loc.pathname === `/${currentWorkspace}/activity`;
  const isAdminActive = loc.pathname === "/admin";
  const isTasksActive = loc.pathname === `/${currentWorkspace}/tasks`;
  const isCalendarActive = loc.pathname === `/${currentWorkspace}/calendar`;
  const isDxpActive = loc.pathname.startsWith(`/${currentWorkspace}/dxp`);
  const isSettingsActive = loc.pathname === `/${currentWorkspace}/settings`;
  const isPmTasksActive = loc.pathname === `/${currentWorkspace}/pm-tasks`;

  const isPRActive = loc.pathname === `/${currentWorkspace}/pr`;
  const isLogisticsActive = loc.pathname === `/${currentWorkspace}/logistics`;

  const isAreaActive = (areaId: string) => {
    if (areaId === "sales") return isSalesActive;
    if (areaId === "dxp") return isDxpActive;
    if (areaId === "pr") return isPRActive;
    if (areaId === "logistics") return isLogisticsActive;
    return isTasksActive && search.area === areaId;
  };

  const navCls = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition w-full",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
    );

  return (
    <aside className="relative flex h-screen w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* brand */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gradient-primary)] ring-glow">
          <CupolaIcon className="text-white" size={22} />
        </div>
        <div className="leading-tight">
          <div className="font-display text-base font-semibold tracking-tight">Lupara</div>
          <div className="text-[11px] text-muted-foreground">Event Management</div>
        </div>
      </div>

      {/* workspace switcher */}
      <div className="px-3">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-2">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {isAdmin ? "All Workspaces" : "My Workspace"}
          </div>
          <div className="space-y-1">
            {visibleWorkspaces.map((w) => {
              const isActive = currentWorkspace === w.id;
              return (
                <Link
                  key={w.id}
                  to="/$workspace"
                  params={{ workspace: w.id }}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br font-display text-xs font-bold text-white shadow-card",
                      w.color,
                    )}
                  >
                    {w.short}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{w.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {w.type === "event" ? "Event Space" : "Department"}
                    </div>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground">
                <Plus className="h-3.5 w-3.5" /> New workspace
              </button>
            )}
          </div>
        </div>
      </div>

      {/* main nav */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {/* Dashboard */}
        <Link
          to="/$workspace"
          params={{ workspace: currentWorkspace }}
          className={navCls(isDashboardActive)}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
          <span className="ml-auto text-[10px] text-muted-foreground">⌘1</span>
        </Link>

        {/* Key areas section */}
        <div className="mt-5 flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {ws?.name ?? currentWorkspace}
          </div>
          <span className="text-[10px] text-muted-foreground">{ws?.progress ?? 0}%</span>
        </div>

        <div className="space-y-0.5">
          {/* PM Tasks link — only for department workspaces */}
          {ws?.type === "department" && (
            <Link
              to="/$workspace/pm-tasks"
              params={{ workspace: currentWorkspace }}
              className={navCls(isPmTasksActive)}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="flex-1 text-sm">Tasks</span>
              <ChevronRight className="h-3 w-3 opacity-40" />
            </Link>
          )}

          {areas.map((a) => {
            const Icon = a.icon;
            // Hide areas that this workspace doesn't expose
            if (ws?.allowedAreas && !ws.allowedAreas.includes(a.id)) return null;
            const visible = canSeeKeyArea(currentWorkspace, a.id);
            if (!visible) return null;
            const active = isAreaActive(a.id);

            if (a.id === "sales") {
              return (
                <Link
                  key={a.id}
                  to="/$workspace/sales"
                  params={{ workspace: currentWorkspace }}
                  className={navCls(active)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-sm">{a.name}</span>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </Link>
              );
            }

            if (a.id === "dxp") {
              return (
                <Link
                  key={a.id}
                  to="/$workspace/dxp/physical"
                  params={{ workspace: currentWorkspace }}
                  className={navCls(active)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-sm">{a.name}</span>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </Link>
              );
            }

            if (a.id === "pr") {
              return (
                <Link
                  key={a.id}
                  to="/$workspace/pr"
                  params={{ workspace: currentWorkspace }}
                  className={navCls(active)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-sm">{a.name}</span>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </Link>
              );
            }

            if (a.id === "logistics") {
              return (
                <Link
                  key={a.id}
                  to="/$workspace/logistics"
                  params={{ workspace: currentWorkspace }}
                  className={navCls(active)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-sm">{a.name}</span>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </Link>
              );
            }

            return (
              <Link
                key={a.id}
                to="/$workspace/tasks"
                params={{ workspace: currentWorkspace }}
                search={{ area: a.id }}
                className={navCls(active)}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-sm">{a.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Workspace section */}
        <div className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace
        </div>
        <div className="space-y-0.5">
          <Link
            to="/$workspace/team"
            params={{ workspace: currentWorkspace }}
            className={navCls(isTeamActive)}
          >
            <Users className="h-4 w-4" />
            Team
          </Link>

          <Link
            to="/$workspace/activity"
            params={{ workspace: currentWorkspace }}
            className={navCls(isActivityActive)}
          >
            <Activity className="h-4 w-4" />
            Activity log
          </Link>

          <Link
            to="/$workspace/calendar"
            params={{ workspace: currentWorkspace }}
            className={navCls(isCalendarActive)}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </Link>

          <Link
            to="/$workspace/settings"
            params={{ workspace: currentWorkspace }}
            className={navCls(isSettingsActive)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>

          {/* notifications */}
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className={navCls(showNotifs)}
          >
            <Bell className="h-4 w-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Admin section — only visible inside the PM & EWA workspace */}
        {isAdmin && currentWorkspace === "pmewa" && (
          <>
            <div className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Admin
            </div>
            <div className="space-y-0.5">
              <Link
                to="/admin"
                className={navCls(isAdminActive)}
              >
                <Shield className="h-4 w-4" />
                Admin panel
                <span className="ml-auto text-[10px] text-muted-foreground">⌘A</span>
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* user */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent/60">
          <Avatar name={user?.name ?? "User"} hue={user?.hue ?? 220} size={36} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{user?.name ?? "Guest"}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {user ? roleLabel(user.role) : "—"}
              {user?.workspaceId ? ` · ${user.workspaceId.toUpperCase()}` : ""}
              {user?.keyAreaId ? ` / ${user.keyAreaId}` : ""}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* notifications panel */}
      {showNotifs && (
        <div className="absolute bottom-20 left-3 right-3 z-50 rounded-2xl border border-border bg-card shadow-elegant">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-muted-foreground hover:text-foreground">
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowNotifs(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No notifications yet</p>
            ) : (
              notifications
                .slice()
                .reverse()
                .map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {n.type === "lead_pending" ? (
                        <ShieldAlert className="h-4 w-4 text-warning" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{n.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.message}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {!n.read && <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </button>
                ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
