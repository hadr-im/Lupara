import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { getLeads, getTasks, getPmTasks, getEventDates, setEventDate, getEventGoals } from "@/lib/db/server-fns";
import { Topbar } from "@/components/app/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Avatar } from "@/components/app/avatar";
import {
  workspaces,
  keyAreas,
  workspaceMembers,
  activityLog,
  type PmTask,
} from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Layers,
  Target,
  ClipboardList,
  Activity,
  Circle,
  Loader2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/")({
  component: WorkspaceDashboard,
});

const toneMap: Record<string, string> = {
  task: "bg-accent",
  lead: "bg-warning",
  member: "bg-primary",
  system: "bg-info",
  file: "bg-muted-foreground",
};

const countdownTheme: Record<string, { card: string; badge: string; title: string }> = {
  tedx:   { card: "bg-gradient-to-br from-red-950 via-rose-900 to-black border-red-800/40", badge: "bg-red-500/20 text-red-300", title: "text-red-200" },
  meetup: { card: "bg-gradient-to-br from-emerald-950 via-green-900 to-black border-green-800/40", badge: "bg-emerald-500/20 text-emerald-300", title: "text-emerald-200" },
};

function CountdownCards({
  countdownEvents, isAdmin, eventDates, onEditRequest,
}: {
  countdownEvents: { ws: { id: string; name: string; eventDate?: string }; diff: number | null; dateStr: string | undefined }[];
  isAdmin: boolean;
  eventDates: Record<string, string>;
  onEditRequest: (wsId: string, currentDate: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {countdownEvents.map(({ ws: w, diff, dateStr }) => {
        const th = countdownTheme[w.id] ?? { card: "bg-card/80 border-border/60", badge: "bg-primary/10 text-primary", title: "text-muted-foreground" };
        return (
          <div key={w.id} className={`rounded-2xl border p-5 ${th.card}`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${th.badge}`}>
                  {w.name}
                </span>
                <div className="font-display text-5xl font-bold mt-3 text-white">
                  {diff !== null ? diff : "—"}
                  {diff !== null && <span className="text-xl font-normal text-white/60 ml-2">days left</span>}
                </div>
                <div className={`text-sm mt-1 font-medium ${th.title}`}>
                  {dateStr
                    ? new Date(dateStr + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
                    : "No date set yet"}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => onEditRequest(w.id, eventDates[w.id] || w.eventDate || "")}
                  title="Edit event date"
                  className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/20 transition"
                >
                  <Pencil className="h-3 w-3" /> Edit date
                </button>
              )}
            </div>
            {diff !== null && diff <= 14 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300">
                ⚠ Event approaching!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkspaceDashboard() {
  const { workspace } = Route.useParams();
  const { user, canSeeKeyArea, isAdmin } = useAuth();

  const ws = workspaces.find((w) => w.id === workspace);
  const wsName = ws?.name ?? workspace.toUpperCase();

  const [allTasks, setAllTasksData] = useState<any[]>([]);
  const [allLeadsData, setAllLeadsData] = useState<any[]>([]);

  useEffect(() => {
    getTasks({ data: { workspaceId: workspace } }).then((r) => setAllTasksData(r as any[])).catch(() => {});
    getLeads({ data: { workspaceId: workspace } }).then((r) => setAllLeadsData(r as any[])).catch(() => {});
  }, [workspace]);

  // KPI computations
  const wsTasks = useMemo(
    () => allTasks.filter((t: any) => t.workspace_id === workspace || t.workspaceId === workspace),
    [allTasks, workspace],
  );
  const doneTasks = useMemo(
    () => wsTasks.filter((t) => t.status === "done").length,
    [wsTasks],
  );
  const inProgressTasks = useMemo(
    () => wsTasks.filter((t) => t.status === "in_progress").length,
    [wsTasks],
  );
  const teamSize = useMemo(
    () =>
      workspaceMembers.filter(
        (m) => m.workspaceId === workspace || m.role === "admin",
      ).length,
    [workspace],
  );
  const [storedEventDates, setStoredEventDates] = useState<Record<string, string>>({});
  const [eventGoals, setEventGoals] = useState<Record<string, number>>({});

  useEffect(() => {
    getEventDates().then((d) => setStoredEventDates(d)).catch(() => {});
    getEventGoals().then((g) => setEventGoals(g)).catch(() => {});
  }, []);
  const effectiveEventDate = storedEventDates[workspace] || ws?.eventDate;

  const currentGoal = useMemo(() => eventGoals[workspace] || 0, [eventGoals, workspace]);

  const daysLeft = useMemo(() => {
    if (!effectiveEventDate) return null;
    const diff = Math.ceil(
      (new Date(effectiveEventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return diff > 0 ? diff : 0;
  }, [effectiveEventDate]);

  const wsLeads = useMemo(
    () => allLeadsData.filter((l: any) => (l.workspace_id ?? l.workspaceId) === workspace),
    [allLeadsData, workspace],
  );
  const pipelineValue = wsLeads.reduce((s, l) => s + Number(l.value ?? 0), 0);
  const confirmedValue = wsLeads
    .filter((l) => l.stage === "confirmed")
    .reduce((s, l) => s + Number(l.value ?? 0), 0);

  const goalChartData = useMemo(() => {
    return [
      {
        name: "Target Goal",
        amount: Math.round(currentGoal),
      },
      {
        name: "Achieved Revenue",
        amount: Math.round(confirmedValue),
      },
    ];
  }, [currentGoal, confirmedValue]);
  const pendingVal = wsLeads.filter((l) => (l.pending_validation ?? l.pendingValidation)).length;

  const chartData = useMemo(() => {
    const now = new Date();
    const confirmedK = confirmedValue / 1000;
    const pipelineK = pipelineValue / 1000;
    return Array.from({ length: 6 }, (_, idx) => {
      const monthsBack = 5 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      const isCurrent = monthsBack === 0;
      return {
        month: d.toLocaleDateString("en-GB", { month: "short" }),
        booked: isCurrent ? Number(confirmedK.toFixed(1)) : 0,
        pipeline: isCurrent ? Number(pipelineK.toFixed(1)) : 0,
      };
    });
  }, [confirmedValue, pipelineValue]);

  // Area breakdown
  const areaStats = useMemo(
    () =>
      keyAreas.map((a) => {
        const areaTasks = wsTasks.filter((t) => t.areaId === a.id);
        const done = areaTasks.filter((t) => t.status === "done").length;
        const total = areaTasks.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return { ...a, done, total, pct };
      }),
    [wsTasks],
  );

  // Recent activity
  const recentActivity = useMemo(
    () =>
      activityLog
        .filter((e) => e.workspaceId === workspace)
        .slice(0, 6),
    [workspace],
  );

  // Upcoming tasks (todo + in_progress with dueDate)
  const upcoming = useMemo(
    () =>
      wsTasks
        .filter((t) => t.status !== "done" && t.dueDate)
        .slice(0, 5),
    [wsTasks],
  );

  const priorityColor: Record<string, string> = {
    critical: "text-destructive",
    high: "text-warning",
    medium: "text-accent",
    low: "text-muted-foreground",
  };

  // ── PM & EWA department dashboard ────────────────────────────────────────
  const [pmTasksData, setPmTasksData] = useState<PmTask[]>([]);
  useEffect(() => {
    getPmTasks({ data: { workspaceId: workspace } })
      .then((rows) => setPmTasksData(rows as PmTask[]))
      .catch(() => {});
  }, [workspace]);

  // Event countdown — admin can set/edit the event date
  const [eventDates, setEventDates] = useState<Record<string, string>>(storedEventDates);
  useEffect(() => { setEventDates(storedEventDates); }, [storedEventDates]);
  const [editingEventDate, setEditingEventDate] = useState(false);
  const [eventDateInput, setEventDateInput] = useState("");

  const saveEventDate = (ws: string, date: string) => {
    const updated = { ...eventDates, [ws]: date };
    setEventDates(updated);
    setStoredEventDates(updated);
    setEventDate({ data: { workspaceId: ws, date, updatedBy: user?.id } }).catch(console.error);
  };

  // Sales revenue across all workspaces (TEDx + MeetupPro)
  const [allSalesLeadsData, setAllSalesLeadsData] = useState<any[]>([]);
  useEffect(() => {
    getLeads().then((r) => setAllSalesLeadsData(r as any[])).catch(() => {});
  }, []);
  const totalPipeline = allSalesLeadsData.reduce((s: number, l: any) => s + Number(l.value ?? 0), 0);
  const totalConfirmedRevenue = allSalesLeadsData.filter((l: any) => l.stage === "confirmed").reduce((s: number, l: any) => Number(s) + Number(l.value ?? 0), 0);

  if (ws?.type === "department") {
    const published = pmTasksData.filter((t) => t.status !== "draft");
    const inProg = published.filter((t) => t.status === "in_progress");
    const done = published.filter((t) => t.status === "done");
    const todo = published.filter((t) => t.status === "todo");
    const deptMembers = workspaceMembers.filter((m) => m.workspaceId === workspace || m.role === "admin");

    // All workspaces countdown
    const countdownEvents = workspaces
      .filter(w => w.type === "event")
      .map(w => {
        const customDate = eventDates[w.id];
        const dateStr = customDate || w.eventDate;
        const diff = dateStr ? Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        return { ws: w, diff: diff !== null && diff >= 0 ? diff : null, dateStr };
      });

    const statusMeta: Record<PmTask["status"], { label: string; Icon: React.ElementType; cls: string }> = {
      draft:       { label: "Draft",       Icon: Circle,       cls: "text-muted-foreground" },
      todo:        { label: "To Do",       Icon: Circle,       cls: "text-info" },
      in_progress: { label: "In Progress", Icon: Loader2,      cls: "text-warning" },
      done:        { label: "Done",        Icon: CheckCircle2, cls: "text-success" },
    };

    return (
      <>
        <Topbar
          breadcrumb={[{ label: wsName }, { label: "Dashboard" }]}
          title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
          subtitle={`PM & EWA department overview`}
          action={
            <div className="flex items-center gap-2">
              <Link to="/admin"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 text-sm font-medium text-cyan-500 transition hover:bg-cyan-500/20">
                <Layers className="h-4 w-4" /> Admin Panel
              </Link>
              <Link to="/$workspace/pm-tasks" params={{ workspace }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-sm font-medium transition hover:bg-card">
                <ClipboardList className="h-4 w-4" /> View Tasks
              </Link>
            </div>
          }
        />
        <div className="space-y-6 px-8 py-6">
          {/* Event countdowns */}
          <CountdownCards
            countdownEvents={countdownEvents}
            isAdmin={isAdmin}
            eventDates={eventDates}
            onEditRequest={(wsId, currentDate) => {
              setEventDateInput(currentDate);
              setEditingEventDate(true);
              (window as any).__editingCountdownWs = wsId;
            }}
          />

          {editingEventDate && isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4">
                <h3 className="font-display font-semibold mb-3">Edit event date</h3>
                <input type="date" value={eventDateInput} onChange={(e) => setEventDateInput(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none mb-4" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingEventDate(false)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40">Cancel</button>
                  <button onClick={() => {
                    const wsId = (window as any).__editingCountdownWs;
                    if (wsId && eventDateInput) { saveEventDate(wsId, eventDateInput); toast.success("Event date updated"); }
                    setEditingEventDate(false);
                  }} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Sales revenue KPIs */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total tasks" value={String(published.length)} delta={2} hint={`${pmTasksData.filter(t=>t.status==="draft").length} in draft`} series={[2,3,3,4,4,5,5,published.length]} tone="primary" />
            <KpiCard label="In progress" value={String(inProg.length)} delta={inProg.length} hint="Currently active" series={[0,1,1,2,2,3,inProg.length,inProg.length]} tone="accent" />
            <KpiCard label="Confirmed revenue" value={`${(totalConfirmedRevenue/1000).toFixed(0)}k TND`} delta={8} hint={`${(totalPipeline/1000).toFixed(0)}k TND total pipeline`} series={[4,5,7,8,9,10,11,Math.round(totalConfirmedRevenue/1000)]} tone="success" />
            <KpiCard label="Team members" value={String(deptMembers.length)} delta={0} hint="All roles" series={[deptMembers.length,deptMembers.length,deptMembers.length,deptMembers.length,deptMembers.length,deptMembers.length,deptMembers.length,deptMembers.length]} tone="accent" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Active task list */}
            <div className="xl:col-span-2 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="font-display text-base font-semibold">Active Tasks</div>
                <a href={`/${workspace}/pm-tasks`} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
                  All tasks <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
              <div className="space-y-2.5">
                {[...todo, ...inProg].slice(0, 6).map((t) => {
                  const sm = statusMeta[t.status];
                  const StatusIcon = sm.Icon;
                  return (
                    <div key={t.id} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-sidebar-accent/30 transition">
                      <StatusIcon className={cn("h-4 w-4 shrink-0 mt-0.5", sm.cls)} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{t.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span>{t.assignedToName}</span>
                          {t.dueDate && <span>· Due {new Date(t.dueDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</span>}
                        </div>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        t.priority==="urgent" ? "bg-destructive/15 text-destructive" :
                        t.priority==="high" ? "bg-warning/15 text-warning" :
                        t.priority==="medium" ? "bg-info/15 text-info" : "bg-muted text-muted-foreground")}>
                        {t.priority}
                      </span>
                    </div>
                  );
                })}
                {[...todo, ...inProg].length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">No active tasks.</p>
                )}
              </div>
            </div>

            {/* Activity + team + AI insight */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display text-sm font-semibold">Live activity</div>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />live
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {recentActivity.length === 0 ? (
                    <li className="py-4 text-center text-xs text-muted-foreground">No recent activity</li>
                  ) : recentActivity.slice(0,4).map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", toneMap[a.type])} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs"><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.action}</span></div>
                        <div className="truncate text-[10px] text-muted-foreground">{a.target}</div>
                        <div className="text-[10px] text-muted-foreground">{a.timestamp}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Team members */}
              <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display text-sm font-semibold">Team</div>
                  <a href={`/${workspace}/team`} className="text-xs text-primary hover:opacity-80">View all</a>
                </div>
                <div className="space-y-2">
                  {deptMembers.slice(0,4).map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <Avatar name={m.name} hue={m.hue} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{m.role}</div>
                      </div>
                      <div className={cn("h-1.5 w-1.5 rounded-full", m.status==="active" ? "bg-success" : "bg-muted")} />
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950 to-emerald-950 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold mb-2 text-cyan-300"><Sparkles className="h-3.5 w-3.5" /> AI insight</div>
                <p className="text-sm leading-snug text-white/80">
                  {inProg.length > 3
                    ? `${inProg.length} tasks in progress across PM&EWA. Consider a sync to unblock bottlenecks before the event.`
                    : totalConfirmedRevenue > 0
                    ? `${(totalConfirmedRevenue/1000).toFixed(0)}k TND confirmed from Sales — update the budget tracker and notify the finance team.`
                    : `No confirmed revenue yet. Push the sales team to move pipeline deals to proposal stage.`}
                </p>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([
              { icon: ClipboardList, label: "PM Tasks", href: `/${workspace}/pm-tasks`, sub: `${published.length} tasks` },
              { icon: Users, label: "Team", href: `/${workspace}/team`, sub: `${deptMembers.length} members` },
              { icon: Calendar, label: "Calendar", href: `/${workspace}/calendar`, sub: "Dept timeline" },
              { icon: Activity, label: "Activity", href: `/${workspace}/activity`, sub: "Full log" },
            ] as const).map((item) => (
              <a key={item.label} href={item.href}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/40 hover:shadow-[0_4px_16px_-8px_var(--primary)] backdrop-blur-xl">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Dashboard" }]}
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        subtitle={`Here's what's pulsing across ${wsName} today.`}
      />
      <div className="space-y-6 px-8 py-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="Pipeline value"
            value={`${(pipelineValue / 1000).toFixed(0)}k TND`}
            delta={12}
            hint={`${wsLeads.length} active deals`}
            series={[18, 22, 19, 28, 32, 30, 41, 48]}
            tone="primary"
          />
          <KpiCard
            label="Confirmed revenue"
            value={`${(confirmedValue / 1000).toFixed(0)}k TND`}
            delta={8}
            hint={`${wsLeads.filter((l) => l.stage === "confirmed").length} partners signed`}
            series={[4, 5, 5, 7, 9, 10, 12, 12]}
            tone="success"
          />
          {daysLeft !== null ? (
            <KpiCard
              label="Days to event"
              value={String(daysLeft)}
              delta={-2}
              hint={effectiveEventDate ? `Event: ${new Date(effectiveEventDate + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Countdown"}
              series={[60, 55, 48, 40, 32, 28, 22, daysLeft]}
              tone={daysLeft < 14 ? "warning" : "accent"}
            />
          ) : (
            <KpiCard
              label="Team members"
              value={String(teamSize)}
              delta={1}
              hint="Across all key areas"
              series={[8, 9, 9, 10, 11, 12, 13, teamSize]}
              tone="accent"
            />
          )}
          {pendingVal > 0 && (
            <div className="md:hidden xl:flex rounded-2xl border border-warning/40 bg-warning/5 p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-warning" />
              <div>
                <div className="text-xs font-semibold text-warning">{pendingVal} pending validation</div>
                <div className="text-[11px] text-muted-foreground">Leads awaiting admin review</div>
              </div>
            </div>
          )}
        </div>

        {/* Chart + activity */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Event Finance
                </div>
                <div className="mt-1 font-display text-xl font-semibold">
                  Goal vs Achieved
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground font-medium">
                  Progress: <span className="font-semibold text-primary">{currentGoal > 0 ? Math.round((confirmedValue / currentGoal) * 100) : 0}%</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  {confirmedValue.toLocaleString()} / {currentGoal.toLocaleString()} TND
                </div>
              </div>
            </div>
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer>
                <BarChart
                  data={goalChartData}
                  margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString()} TND`, "Amount"]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={60}>
                    {goalChartData.map((entry, idx) => {
                      const color = idx === 0 
                        ? (workspace === "tedx" ? "#f43f5e" : "#6366f1") // target goal colored by brand
                        : "#10b981"; // achieved colored by success (green)
                      return <Cell key={`cell-${idx}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="font-display text-base font-semibold">Live activity</div>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                live
              </span>
            </div>
            <ul className="mt-4 space-y-3">
              {recentActivity.length === 0 ? (
                <li className="text-xs text-muted-foreground py-4 text-center">No recent activity</li>
              ) : (
                recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <div
                      className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", toneMap[a.type])}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{a.who}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{a.target}</div>
                      <div className="text-[10px] text-muted-foreground">{a.timestamp}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <Link
              to="/$workspace/activity"
              params={{ workspace }}
              className="mt-4 flex items-center gap-1 text-xs text-primary hover:opacity-80"
            >
              View all activity <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Area progress */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-3 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Key areas
                </div>
                <div className="mt-1 font-display text-xl font-semibold">
                  Tasks by area
                </div>
              </div>
              <Link
                to="/$workspace/tasks"
                params={{ workspace }}
                search={{ area: "marketing" }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
              >
                Open board <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {areaStats.map((a) => {
                const visible = canSeeKeyArea(workspace, a.id);
                if (!visible) return null;
                return (
                  <Link
                    key={a.id}
                    to="/$workspace/tasks"
                    params={{ workspace }}
                    search={{ area: a.id }}
                    className="group flex items-center gap-3 rounded-xl p-2 hover:bg-sidebar-accent/40 transition"
                  >
                    <div className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                      {a.name}
                    </div>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted/50">
                      <div
                        className="h-full rounded-md transition-all bg-gradient-to-r from-primary/60 to-accent/40"
                        style={{ width: `${a.pct}%` }}
                      />
                      <span className="absolute inset-y-0 left-3 inline-flex items-center text-[11px] font-medium">
                        {a.pct}%
                      </span>
                      <span className="absolute inset-y-0 right-2 inline-flex items-center font-mono text-[11px] text-foreground/60">
                        {a.done}/{a.total}
                      </span>
                    </div>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              { icon: Layers, label: "Sales Pipeline", href: `/${workspace}/sales`, sub: `${wsLeads.length} deals` },
              { icon: CheckCircle2, label: "Task Board", href: `/${workspace}/tasks?area=marketing`, sub: `${wsTasks.length} tasks` },
              { icon: Users, label: "Team", href: `/${workspace}/team`, sub: `${teamSize} members` },
              { icon: Target, label: "Activity", href: `/${workspace}/activity`, sub: "Full log" },
            ] as const
          ).map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/40 hover:shadow-[0_4px_16px_-8px_var(--primary)] backdrop-blur-xl"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
