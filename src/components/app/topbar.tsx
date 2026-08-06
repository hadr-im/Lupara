import { Search, Bell, Sparkles, Plus, Command, X, ShieldAlert, ShieldCheck, ShieldX, LayoutDashboard, TrendingUp, Sparkles as SparklesIcon, Truck, Megaphone, Globe2, FileText, Users, Settings, CalendarDays } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/lib/notifications-context";
import { useParams } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getLeads, upsertLead } from "@/lib/db/server-fns";

const SEARCH_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: (ws: string) => `/${ws}` },
  { label: "Sales", icon: TrendingUp, path: (ws: string) => `/${ws}/sales` },
  { label: "DXP / Experience", icon: SparklesIcon, path: (ws: string) => `/${ws}/dxp/physical` },
  { label: "Logistics", icon: Truck, path: (ws: string) => `/${ws}/tasks?area=logistics` },
  { label: "Marketing", icon: Megaphone, path: (ws: string) => `/${ws}/tasks?area=marketing` },
  { label: "Public Relations", icon: Globe2, path: (ws: string) => `/${ws}/tasks?area=pr` },
  { label: "Content", icon: FileText, path: (ws: string) => `/${ws}/tasks?area=content` },
  { label: "Team", icon: Users, path: (ws: string) => `/${ws}/team` },
  { label: "Calendar", icon: CalendarDays, path: (ws: string) => `/${ws}/calendar` },
  { label: "Settings", icon: Settings, path: (ws: string) => `/${ws}/settings` },
];

export function Topbar({
  title,
  subtitle,
  breadcrumb,
  action,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: React.ReactNode;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markRead, markAllRead, push } = useNotifications();
  const { user, isAdmin, managedUsers } = useAuth();

  const handleValidateLead = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    if (!notification.leadId) return;

    try {
      const allLeads = await getLeads();
      const lead = allLeads.find((l: any) => l.id === notification.leadId);
      if (!lead) {
        toast.error("Lead not found");
        return;
      }

      await upsertLead({
        data: {
          ...lead,
          pendingValidation: false,
          validated: true,
        }
      });

      markRead(notification.id);

      if (lead.assigneeId) {
        push({
          type: "lead_validated",
          title: "Your lead was validated!",
          message: `"${lead.company}" has been approved by admin. You can progress it in the pipeline.`,
          leadId: lead.id,
          targetRole: "oc",
          targetUserId: lead.assigneeId,
          workspaceId: lead.workspaceId,
        });
      }

      toast.success(`${lead.company} validated`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to validate");
    }
  };

  const handleRejectLead = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    if (!notification.leadId) return;

    try {
      const allLeads = await getLeads();
      const lead = allLeads.find((l: any) => l.id === notification.leadId);
      if (!lead) {
        toast.error("Lead not found");
        return;
      }

      await upsertLead({
        data: {
          ...lead,
          pendingValidation: false,
          validated: false,
          stage: "lost",
        }
      });

      markRead(notification.id);

      if (lead.assigneeId) {
        const submitter = managedUsers.find((m) => m.id === lead.assigneeId);
        push({
          type: "lead_rejected",
          title: "Lead not approved",
          message: `"${lead.company}" was not approved by admin.`,
          leadId: lead.id,
          targetRole: submitter?.role ?? "oc",
          targetUserId: lead.assigneeId,
          workspaceId: lead.workspaceId,
        });
      }

      toast.success(`${lead.company} rejected`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject");
    }
  };

  const params = useParams({ strict: false }) as { workspace?: string };
  const workspace = params.workspace ?? "tedx";

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowNotifs(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setSearchQuery("");
    }
  }, [showSearch]);

  // Close notifs panel on outside click
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  const filtered = SEARCH_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border/60 bg-background/70 px-8 pt-5 pb-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {breadcrumb && (
              <nav className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {breadcrumb.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="opacity-40">/</span>}
                    <span className={i === breadcrumb.length - 1 ? "text-foreground" : ""}>
                      {b.label}
                    </span>
                  </span>
                ))}
              </nav>
            )}
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick search */}
            <button
              onClick={() => setShowSearch(true)}
              className="hidden items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground md:flex"
            >
              <Search className="h-3.5 w-3.5" />
              Quick search
              <kbd className="ml-3 inline-flex items-center gap-0.5 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px]">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            {/* Bell */}
            <div className="relative" ref={notifsRef}>
              <button
                onClick={() => setShowNotifs((v) => !v)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-border bg-card shadow-elegant">
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                    <span className="text-sm font-semibold">Notifications</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifs(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        No notifications yet
                      </p>
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
                              {n.type === "lead_rejected" || n.type === "review_rejected" ? (
                                <ShieldX className="h-4 w-4 text-destructive" />
                              ) : n.type === "lead_pending" || n.type === "review_submitted" ? (
                                <ShieldAlert className="h-4 w-4 text-warning" />
                              ) : (
                                <ShieldCheck className="h-4 w-4 text-success" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium">{n.title}</div>
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                {n.message}
                              </div>
                              {isAdmin && n.type === "lead_pending" && !n.read && (
                                <div className="flex gap-1.5 mt-2">
                                  <button
                                    onClick={(e) => handleValidateLead(e, n)}
                                    className="rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 transition"
                                  >
                                    Validate
                                  </button>
                                  <button
                                    onClick={(e) => handleRejectLead(e, n)}
                                    className="rounded bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 px-2 py-0.5 text-[10px] font-semibold text-destructive transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              <div className="mt-1 text-[10px] text-muted-foreground">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                            {!n.read && (
                              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI assist */}
            <button
              onClick={() =>
                toast.info("AI Assist", {
                  description: "AI-powered insights coming soon. Stay tuned!",
                })
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--gradient-primary)] px-3.5 text-sm font-medium text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <Sparkles className="h-3.5 w-3.5" /> AI assist
            </button>

            {/* Custom action or nothing */}
            {action && action}
          </div>
        </div>
      </header>

      {/* Quick search modal */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-elegant overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, areas, settings…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={() => setShowSearch(false)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto py-2 scrollbar-thin">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No results found</p>
              ) : (
                filtered.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.path(workspace)}
                      onClick={() => setShowSearch(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-sidebar-accent/60"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </a>
                  );
                })
              )}
            </div>
            <div className="border-t border-border/60 px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span><kbd className="rounded border border-border/60 px-1">↵</kbd> navigate</span>
              <span><kbd className="rounded border border-border/60 px-1">Esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
