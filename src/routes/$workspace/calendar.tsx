import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Topbar } from "@/components/app/topbar";
import {
  workspaces,
  keyAreas,
  type CalendarEvent,
} from "@/lib/mock/data";
import { getMeetings, getTasks, getCalendarEvents, upsertCalendarEvent, deleteCalendarEvent, getPrPeople } from "@/lib/db/server-fns";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, X, ChevronLeft, ChevronRight, Calendar as CalIcon, Flag, Zap, Target, Clock, Mic, Tv, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/avatar";

export const Route = createFileRoute("/$workspace/calendar")({
  component: CalendarPage,
});

const typeConfig = {
  deadline: { label: "Deadline", icon: Flag, color: "bg-destructive/10 text-destructive ring-destructive/30", dot: "bg-destructive" },
  milestone: { label: "Milestone", icon: Zap, color: "bg-primary/10 text-primary ring-primary/30", dot: "bg-primary" },
  meeting: { label: "Meeting", icon: Clock, color: "bg-accent/10 text-accent ring-accent/30", dot: "bg-accent" },
  event: { label: "Event", icon: CalIcon, color: "bg-success/10 text-success ring-success/30", dot: "bg-success" },
  campaign: { label: "Campaign", icon: Target, color: "bg-warning/10 text-warning ring-warning/30", dot: "bg-warning" },
};

const AREA_COLORS: Record<string, string> = {
  marketing: "#f59e0b",
  content: "#06b6d4",
  pr: "#8b5cf6",
  dxp: "#ec4899",
  logistics: "#10b981",
  sales: "#3b82f6",
};

const ALL_CALENDAR_AREAS = ["marketing", "content", "pr", "dxp", "logistics", "sales"];

function CalendarPage() {
  const { workspace } = Route.useParams();
  const { user, canSeeKeyArea, isAdmin } = useAuth();

  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace.toUpperCase();
  // Restrict which areas appear in this workspace's calendar
  const CALENDAR_AREAS = wsData?.allowedAreas ?? ALL_CALENDAR_AREAS;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", areaId: "marketing", date: "", endDate: "",
    type: "milestone" as CalendarEvent["type"], description: "", assignedTo: "",
  });

  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [prPeople, setPrPeople] = useState<any[]>([]);

  const fetchAllData = () => {
    getMeetings({ data: { workspaceId: workspace } })
      .then((mList) => setMeetings(mList as any[]))
      .catch(console.error);
    getTasks({ data: { workspaceId: workspace } })
      .then((tList) => setTasks(tList as any[]))
      .catch(console.error);
    getCalendarEvents({ data: { workspaceId: workspace } })
      .then((cList) => setCalendarEvents(cList as any[]))
      .catch(console.error);
    getPrPeople({ data: { workspaceId: workspace } })
      .then((pList) => setPrPeople(pList as any[]))
      .catch(console.error);
  };

  useEffect(() => {
    fetchAllData();
  }, [workspace]);

  // Manually created events mapped
  const events = useMemo(() => {
    return calendarEvents.map((e: any) => ({
      id: e.id,
      workspaceId: e.workspace_id,
      areaId: e.area_id ?? "marketing",
      title: e.title,
      date: e.date ? e.date.slice(0, 10) : "",
      time: e.time ?? "",
      type: e.type as CalendarEvent["type"],
      description: e.description ?? "",
      assignedTo: e.assigned_to ?? "",
    }));
  }, [calendarEvents]);

  // Merge task due dates as calendar events
  const taskEvents = useMemo(() => {
    return tasks
      .filter((t: any) => t.workspace_id === workspace && t.due_date && CALENDAR_AREAS.includes(t.area_id))
      .map((t: any) => ({
        id: `task-${t.id}`, workspaceId: workspace, areaId: t.area_id,
        title: t.title, date: t.due_date.includes("-") ? t.due_date.slice(0, 10) : "",
        type: "deadline" as const, description: `Task deadline · ${(t.status ?? "").replace("_", " ")}`,
      })) as CalendarEvent[];
  }, [tasks, workspace, CALENDAR_AREAS]);

  // Sales meetings → calendar
  const meetingEvents = useMemo(() => {
    return meetings
      .filter((m: any) => m.workspace_id === workspace && m.scheduled_date && m.status === "scheduled")
      .map((m: any) => ({
        id: `meeting-${m.id}`, workspaceId: workspace, areaId: "sales",
        title: `Meeting: ${m.company}`, date: m.scheduled_date.slice(0, 10),
        time: m.scheduled_time ?? "",
        type: "meeting" as const,
        description: m.notes ?? "",
        location: m.location ?? "",
        assignedOcName: m.assigned_oc_name ?? "",
        assignedOcHue: m.assigned_oc_hue ?? 220,
      }));
  }, [meetings, workspace]);

  // PR confirmed interventions → calendar
  const prEvents = useMemo(() => {
    return prPeople
      .filter((p: any) => (workspace === "pmewa" || p.workspace_id === workspace) && p.stage === "confirmed" && p.confirmed_date)
      .map((p: any) => ({
        id: `pr-${p.id}`, workspaceId: p.workspace_id, areaId: "pr",
        title: `${p.type === "speaker" ? "🎤" : "📺"} ${p.name}`, date: p.confirmed_date.slice(0, 10),
        type: "event" as const, description: `${p.confirmed_time ?? ""} · ${p.type === "speaker" ? `Topic: ${p.topic ?? "TBD"}` : p.media_type ?? "Media"} · ${p.organization}`,
      })) as CalendarEvent[];
  }, [prPeople, workspace]);

  const allEvents = useMemo(() => {
    const merged = [...events, ...taskEvents, ...meetingEvents, ...prEvents].filter(
      (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i
    );
    return filterArea === "all" ? merged : merged.filter((e) => e.areaId === filterArea);
  }, [events, taskEvents, meetingEvents, prEvents, filterArea]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    allEvents.forEach((e) => {
      if (!e.date || !e.date.includes("-")) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [allEvents]);

  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  const visibleAreas = CALENDAR_AREAS.filter((a) => canSeeKeyArea(workspace, a));

  const canEdit = isAdmin || user?.role === "ocp" || user?.role === "ocvp";

  const openNew = (date?: string) => {
    setEditingId(null);
    setForm({ title: "", areaId: visibleAreas[0] ?? "marketing", date: date ?? "", endDate: "", type: "milestone", description: "", assignedTo: "" });
    setShowForm(true);
  };

  const openEdit = (e: any) => {
    if (e.id.startsWith("task-") || e.id.startsWith("meeting-") || e.id.startsWith("pr-")) return; // read-only
    setEditingId(e.id);
    setForm({ title: e.title, areaId: e.areaId, date: e.date, endDate: e.endDate ?? "", type: e.type, description: e.description, assignedTo: e.assignedTo ?? "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.date) { toast.error("Title and date required."); return; }
    const payload = {
      id: editingId ?? `CE-${Date.now()}`,
      workspaceId: workspace,
      areaId: form.areaId,
      title: form.title,
      date: form.date,
      time: form.endDate || undefined,
      type: form.type,
      description: form.description,
      assignedTo: form.assignedTo,
    };
    upsertCalendarEvent({ data: payload })
      .then(() => {
        toast.success(editingId ? "Event updated." : "Event added.");
        fetchAllData();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to save event");
      });
    setShowForm(false);
  };

  const deleteEvent = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete events."); return; }
    deleteCalendarEvent({ data: { id } })
      .then(() => {
        toast.success("Event deleted.");
        fetchAllData();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete event");
      });
  };

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Calendar" }]}
        title="Timeline Calendar"
        subtitle="Track milestones, deadlines and events across key areas"
        action={canEdit ? (
          <button onClick={() => openNew()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-3 text-xs font-medium text-primary-foreground shadow-card hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add Event
          </button>
        ) : undefined}
      />

      {/* Area filters */}
      <div className="border-b border-border/60 px-8 py-3 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <button onClick={() => setFilterArea("all")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition ring-1", filterArea === "all" ? "bg-primary text-primary-foreground ring-primary/50" : "ring-border text-muted-foreground hover:ring-primary/40")}>All areas</button>
        {visibleAreas.map((a) => {
          const area = keyAreas.find((k) => k.id === a);
          return (
            <button key={a} onClick={() => setFilterArea(a === filterArea ? "all" : a)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition ring-1", filterArea === a ? "text-white ring-transparent" : "ring-border text-muted-foreground hover:ring-primary/40")}
              style={filterArea === a ? { backgroundColor: AREA_COLORS[a] } : {}}>
              {area?.name ?? a}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }} className="rounded-lg p-1.5 hover:bg-sidebar-accent/60 text-muted-foreground"><ChevronLeft className="h-4 w-4" /></button>
              <h3 className="font-display text-lg font-semibold">{monthName}</h3>
              <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }} className="rounded-lg p-1.5 hover:bg-sidebar-accent/60 text-muted-foreground"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} className="rounded-lg px-3 py-1.5 text-xs border border-border hover:bg-sidebar-accent/40">Today</button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/60">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-sidebar-accent/30 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} className="bg-card min-h-[90px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = dateStr(day);
              const dayEvents = eventsByDate[ds] ?? [];
              const isToday = ds === today.toISOString().slice(0, 10);
              const isSelected = selectedDay === ds;
              return (
                <div key={ds} onClick={() => setSelectedDay(isSelected ? null : ds)}
                  className={cn("bg-card min-h-[90px] p-2 cursor-pointer hover:bg-sidebar-accent/20 transition", isSelected && "bg-sidebar-accent/50 ring-2 ring-inset ring-primary/30")}>
                  <div className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1", isToday ? "bg-primary text-primary-foreground" : "text-foreground")}>{day}</div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const color = AREA_COLORS[ev.areaId] ?? "#888";
                      const isMeeting = ev.type === "meeting";
                      return (
                        <div key={ev.id} className="flex flex-col rounded px-1 py-0.5 text-[10px] leading-tight mb-0.5" style={{ backgroundColor: `${color}18`, color }}>
                          <div className="flex items-center gap-1 min-w-0">
                            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="truncate font-medium">{ev.title}</span>
                          </div>
                          {isMeeting && ev.assignedOcName && (
                            <span className="text-[9px] opacity-85 mt-0.5 pl-2.5 truncate font-normal">
                              👤 {ev.assignedOcName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground px-1 font-medium">+{dayEvents.length - 3}</div>}
                  </div>
                  {canEdit && !isSelected && (
                    <button onClick={(e) => { e.stopPropagation(); openNew(ds); }} className="opacity-0 hover:opacity-100 w-full text-[10px] text-muted-foreground hover:text-primary mt-0.5 text-left px-1 transition group-hover:opacity-100">
                      <Plus className="h-2.5 w-2.5 inline" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(AREA_COLORS).filter(([k]) => visibleAreas.includes(k)).map(([area, color]) => (
              <div key={area} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {keyAreas.find((k) => k.id === area)?.name ?? area}
              </div>
            ))}
            {Object.entries(typeConfig).map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <cfg.icon className="h-3 w-3" />{cfg.label}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-80 shrink-0 border-l border-border/60 flex flex-col">
          <div className="px-4 py-4 border-b border-border/40">
            <div className="text-sm font-semibold">
              {selectedDay ? new Date(selectedDay + "T00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "Select a day"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedDayEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                {selectedDay ? "Nothing scheduled." : "Click a day to see events."}
                {selectedDay && canEdit && (
                  <div className="mt-3"><button onClick={() => openNew(selectedDay)} className="text-primary hover:underline text-xs"><Plus className="h-3 w-3 inline" /> Add event</button></div>
                )}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {selectedDayEvents.map((ev) => {
                  const { label, icon: Icon, color } = typeConfig[ev.type] ?? typeConfig.event;
                  const areaColor = AREA_COLORS[ev.areaId] ?? "#888";
                  const isTask = ev.id.startsWith("task-");
                  const isMeeting = ev.id.startsWith("meeting-");
                  const isPr = ev.id.startsWith("pr-");
                  return (
                    <div key={ev.id} className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: areaColor }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium leading-snug">{ev.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", color)}><Icon className="h-2.5 w-2.5 inline mr-0.5" />{label}</span>
                            <span className="text-[10px] text-muted-foreground" style={{ color: areaColor }}>{keyAreas.find((k) => k.id === ev.areaId)?.name ?? ev.areaId}</span>
                          </div>
                        </div>
                      </div>
                      {ev.description && <p className="text-xs text-muted-foreground leading-relaxed mb-2">{ev.description}</p>}
                      {ev.type === "meeting" && (
                        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                          {ev.time && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/75" />
                              <span>{ev.time}</span>
                            </div>
                          )}
                          {ev.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground/75" />
                              <span>{ev.location}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {ev.type === "meeting" && ev.assignedOcName && (
                        <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Assigned OC</span>
                          <div className="flex items-center gap-2">
                            <Avatar name={ev.assignedOcName} hue={ev.assignedOcHue ?? 220} size="sm" />
                            <span className="text-xs font-medium text-foreground">{ev.assignedOcName}</span>
                          </div>
                        </div>
                      )}
                      {ev.assignedTo && !isMeeting && <div className="text-xs text-muted-foreground mt-1">Assigned: {ev.assignedTo}</div>}
                      {!isTask && !isMeeting && !isPr && canEdit && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => openEdit(ev)} className="flex-1 rounded-lg border border-border/60 py-1 text-xs hover:bg-sidebar-accent/40">Edit</button>
                          {isAdmin && <button onClick={() => deleteEvent(ev.id)} className="rounded-lg border border-destructive/30 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/5">Del</button>}
                        </div>
                      )}
                      {isTask && (
                        <Link to="/$workspace/tasks" params={{ workspace }} search={{ area: ev.areaId }}
                          className="mt-2 block text-center text-xs text-primary hover:underline">View task →</Link>
                      )}
                      {isMeeting && (
                        <Link to="/$workspace/sales" params={{ workspace }}
                          className="mt-2 block text-center text-xs text-primary hover:underline">Go to Sales pipeline →</Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="font-display font-semibold mb-4">{editingId ? "Edit Event" : "Add Event"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Area</label>
                  <select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {visibleAreas.map((a) => <option key={a} value={a}>{keyAreas.find((k) => k.id === a)?.name ?? a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">End Date (optional)</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Assigned To (optional)</label>
                <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
              <button onClick={handleSubmit} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
