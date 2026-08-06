import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/app/shell";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import {
  workspaceMembers,
  workspaces,
  keyAreas,
  type WorkspaceMember,
  type PmTask,
} from "@/lib/mock/data";
import { getLeads, upsertLead, getTasks, upsertTask, getPmTasks, upsertPmTask, getEventGoals, setEventGoal, getTalks, upsertTalk, deleteTalk } from "@/lib/db/server-fns";
import { useAuth, roleLabel } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import type { Role } from "@/lib/types";
import {
  Shield, Users, ShieldAlert, ShieldCheck, Trash2,
  BarChart3, CheckCircle2, ArrowUpRight, X, Edit3,
  UserPlus, ClipboardList, XCircle, Eye, FileText,
  ExternalLink, Target, ListOrdered, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const DELETED_STATIC_KEY = "cupola_deleted_static_ids";

const roleColors: Record<string, string> = {
  admin: "bg-cyan-500/10 text-cyan-500 ring-cyan-500/30",
  ocp:   "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30",
  ocvp:  "bg-teal-500/10 text-teal-600 ring-teal-500/30",
  oc:    "bg-muted text-muted-foreground ring-border",
};

type Tab = "members" | "validations" | "reviews" | "pmtasks" | "analytics" | "goals" | "talks";

function AdminPage() {
  const { user, isAdmin, managedUsers, removeManagedUser, updateManagedUser, addManagedUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isAdmin) {
      router.navigate({ to: "/$workspace", params: { workspace: user.workspaceId ?? "tedx" }, replace: true });
    }
  }, [user, isAdmin]);

  const [tab, setTab] = useState<Tab>("members");

  // ── Leads ─────────────────────────────────────────────────────────────────────
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const pendingLeads = useMemo(() => allLeads.filter((l: any) => l.pendingValidation), [allLeads]);

  useEffect(() => {
    getLeads().then((rows) => setAllLeads(rows as any[])).catch(() => {});
  }, []);

  function persistLeads(updated: any[]) {
    setAllLeads(updated);
    for (const l of updated) {
      upsertLead({ data: {
        id: l.id, workspaceId: l.workspaceId, company: l.company,
        companyType: l.companyType, address: l.address, contact: l.contact,
        email: l.email, phone: l.phone, industry: l.industry,
        interest: l.interest, value: l.value, probability: l.probability,
        stage: l.stage, stageData: l.stageData, assigneeId: l.assigneeId,
        tags: l.tags, notes: l.notes,
        pendingValidation: l.pendingValidation, validated: l.validated,
      }}).catch(console.error);
    }
  }

  // ── Content/Marketing tasks in review ────────────────────────────────────────
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const reviewTasks = useMemo(() => allTasks.filter((t: any) => t.status === "review"), [allTasks]);

  useEffect(() => {
    getTasks().then((rows) => setAllTasks(rows as any[])).catch(() => {});
  }, []);

  function persistTasks(updated: any[]) {
    setAllTasks(updated);
    for (const t of updated) {
      upsertTask({ data: {
        id: t.id, workspaceId: t.workspaceId, areaId: t.areaId,
        title: t.title, description: t.description, status: t.status,
        priority: t.priority, dueDate: t.dueDate, assigneeId: t.assigneeId,
        tags: t.tags, reviewLink: t.reviewLink, rejectionReason: t.rejectionReason,
      }}).catch(console.error);
    }
  }

  // ── Deleted static user IDs (session-only — admins always reappear on reload) ──
  const [deletedStaticIds, setDeletedStaticIds] = useState<Set<string>>(() => {
    localStorage.removeItem(DELETED_STATIC_KEY);
    return new Set<string>();
  });

  function removeStaticUser(id: string) {
    const next = new Set(deletedStaticIds);
    next.add(id);
    setDeletedStaticIds(next);
  }

  // ── PM Tasks ─────────────────────────────────────────────────────────────────
  const [allPmTasks, setAllPmTasks] = useState<PmTask[]>([]);

  useEffect(() => {
    getPmTasks().then((rows) => setAllPmTasks(rows as PmTask[])).catch(() => {});
  }, []);

  function persistPmTasks(updated: PmTask[]) {
    setAllPmTasks(updated);
    for (const t of updated) {
      upsertPmTask({ data: {
        id: t.id, workspaceId: t.workspaceId, title: t.title,
        description: t.description, priority: t.priority, status: t.status,
        dueDate: t.dueDate, assignedTo: t.assignedTo,
        assignedToName: t.assignedToName, assignedToHue: t.assignedToHue,
        createdBy: t.createdBy, publishedAt: t.publishedAt,
      }}).catch(console.error);
    }
  }

  // ── Combined member list ──────────────────────────────────────────────────────
  const allMembers: WorkspaceMember[] = useMemo(() => {
    const managed = managedUsers.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      workspaceId: u.workspaceId ?? undefined,
      keyAreaId: u.keyAreaId ?? undefined,
      hue: u.hue, joinedAt: "Recently", status: "active" as const,
    }));
    const staticIds = new Set(workspaceMembers.map((m) => m.id));
    const filteredStatic = workspaceMembers.filter((m) => !deletedStaticIds.has(m.id));
    return [...filteredStatic, ...managed.filter((m) => !staticIds.has(m.id))];
  }, [managedUsers, deletedStaticIds]);

  // ── Platform stats ───────────────────────────────────────────────────────────
  const confirmedRevenue = useMemo(() => {
    return allLeads
      .filter((l: any) => l.stage === "confirmed")
      .reduce((sum: number, l: any) => {
        const sd = l.stageData ?? l.stage_data;
        return sum + Number(sd?.confirmed?.amount ?? l.value ?? 0);
      }, 0);
  }, [allLeads]);

  const stats = useMemo(() => ({
    totalMembers: allMembers.length,
    activeWorkspaces: workspaces.length,
    totalTasks: allTasks.length,
    doneTasks: allTasks.filter((t: any) => t.status === "done").length,
    pendingLeads: pendingLeads.length,
    totalLeads: allLeads.length,
    reviewTasks: reviewTasks.length,
    pmTasks: allPmTasks.filter((t) => t.status !== "draft").length,
    pmDone: allPmTasks.filter((t) => t.status === "done").length,
  }), [allMembers, pendingLeads, allLeads, allPmTasks, allTasks, reviewTasks]);

  if (!isAdmin) return null;

  const TABS: { id: Tab; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id: "members",     label: "Members",            Icon: Users,         badge: undefined },
    { id: "validations", label: "Lead Validations",   Icon: ShieldAlert,   badge: pendingLeads.length },
    { id: "reviews",     label: "Content Reviews",    Icon: FileText,      badge: reviewTasks.length },
    { id: "pmtasks",     label: "PM Tasks",           Icon: ClipboardList, badge: allPmTasks.filter(t => t.status === "draft").length },
    { id: "goals",       label: "Event Goals",        Icon: Target,        badge: undefined },
    { id: "talks",       label: "Talks & Panels",     Icon: ListOrdered,   badge: undefined },
    { id: "analytics",   label: "Analytics",          Icon: BarChart3,     badge: undefined },
  ];

  return (
    <Shell>
      {/* PM & EWA color accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-emerald-500" />
      <Topbar
        breadcrumb={[{ label: "Admin" }, { label: "Panel" }]}
        title="Admin panel"
        subtitle="PM & EWA · Manage members, validations, content reviews and platform analytics"
      />

      {/* Stats row */}
      <div className="px-8 py-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {[
            { label: "Members",        value: stats.totalMembers,      color: "text-cyan-500" },
            { label: "Workspaces",     value: stats.activeWorkspaces,  color: "text-emerald-600" },
            { label: "Total tasks",    value: stats.totalTasks,        color: "text-teal-500" },
            { label: "Tasks done",     value: stats.doneTasks,         color: "text-success" },
            { label: "Pending leads",  value: stats.pendingLeads,      color: "text-warning" },
            { label: "In review",      value: stats.reviewTasks,       color: "text-info" },
            { label: "PM tasks",       value: stats.pmTasks,           color: "text-cyan-500" },
            { label: "Revenue (TND)",  value: confirmedRevenue.toLocaleString(), color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-cyan-500/10 bg-card/60 p-3 text-center">
              <div className={cn("font-display text-2xl font-semibold", s.color)}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-cyan-500/20 px-8">
        <div className="flex gap-1">
          {TABS.map(({ id, label, Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition",
                tab === id
                  ? "border-cyan-500/30 bg-card text-cyan-600"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {badge != null && badge > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/10 px-1 font-mono text-[10px] text-cyan-600 ring-1 ring-cyan-500/30">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        {tab === "members" && (
          <MembersTab
            members={allMembers}
            onRemove={(id) => {
              if (workspaceMembers.some((s) => s.id === id)) {
                removeStaticUser(id);
              } else {
                removeManagedUser(id);
              }
              toast.success("Member removed");
            }}
            onUpdate={(id, patch) => { updateManagedUser(id, patch); toast.success("Access updated"); }}
            onAdd={async (u) => {
              const res = await addManagedUser(u);
              if (res?.error) { toast.error(res.error); return res; }
              toast.success(`${u.name} added`);
              return {};
            }}
          />
        )}
        {tab === "validations" && (
          <ValidationsTab
            pendingLeads={pendingLeads}
            allLeads={allLeads}
            onPersistLeads={persistLeads}
          />
        )}
        {tab === "reviews" && (
          <ReviewsTab
            reviewTasks={reviewTasks}
            allTasks={allTasks}
            onPersistTasks={persistTasks}
          />
        )}
        {tab === "pmtasks" && (
          <PmTasksTab tasks={allPmTasks} onPersist={persistPmTasks} />
        )}
        {tab === "goals" && (
          <GoalsTab />
        )}
        {tab === "talks" && (
          <TalksTab />
        )}
        {tab === "analytics" && (
          <AnalyticsTab stats={stats} pmTasks={allPmTasks} allLeads={allLeads} allTasks={allTasks} />
        )}
      </div>
    </Shell>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────
function MembersTab({
  members, onRemove, onUpdate, onAdd,
}: {
  members: WorkspaceMember[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: any) => void;
  onAdd: (u: any) => Promise<{ error?: string }>;
}) {
  const [filterWs, setFilterWs] = useState("all");
  const [editing, setEditing] = useState<WorkspaceMember | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editForm, setEditForm] = useState({ role: "oc" as Role, workspaceId: "", keyAreaId: "" });
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "oc" as Role, workspaceId: "", keyAreaId: "", hue: 220 });

  const filtered = useMemo(() => {
    if (filterWs === "all") return members;
    return members.filter((m) => m.workspaceId === filterWs || m.role === "admin");
  }, [members, filterWs]);

  const openEdit = (m: WorkspaceMember) => {
    setEditing(m);
    setEditForm({ role: m.role, workspaceId: m.workspaceId ?? "", keyAreaId: m.keyAreaId ?? "" });
  };

  const handleEditSave = () => {
    if (!editing) return;
    onUpdate(editing.id, {
      role: editForm.role,
      workspaceId: editForm.workspaceId || undefined,
      keyAreaId: editForm.keyAreaId || undefined,
    });
    setEditing(null);
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.email) { toast.error("Name and email required."); return; }
    if (!addForm.password || addForm.password.length < 8) {
      toast.error("Set an initial password (at least 8 characters).");
      return;
    }
    const res = await onAdd({ ...addForm, workspaceId: addForm.workspaceId || undefined, keyAreaId: addForm.keyAreaId || undefined });
    if (res?.error) return; // keep the modal open so the admin can fix it
    setShowAdd(false);
    setAddForm({ name: "", email: "", password: "", role: "oc", workspaceId: "", keyAreaId: "", hue: 220 });
  };

  // All key areas are available for member assignment regardless of workspace allowedAreas
  // (allowedAreas only controls sidebar navigation, not member key area assignments)
  const filteredKeyAreas = keyAreas;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[{ id: "all", name: "All workspaces" }, ...workspaces].map((w) => (
            <button
              key={w.id}
              onClick={() => setFilterWs(w.id)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filterWs === w.id ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white" : "border border-border text-muted-foreground hover:text-foreground")}
            >
              {w.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 shadow-sm"
        >
          <UserPlus className="h-4 w-4" /> Add Member
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30">
              {["Member", "Role", "Workspace", "Key area", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, idx) => {
              const ws = workspaces.find((w) => w.id === m.workspaceId);
              const area = keyAreas.find((a) => a.id === m.keyAreaId);
              return (
                <tr key={m.id} className={cn("border-b border-border/40 transition hover:bg-secondary/20", idx % 2 !== 0 && "bg-secondary/10")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name} hue={m.hue} size={32} />
                      <div>
                        <div className="font-medium text-sm">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", roleColors[m.role])}>
                      <Shield className="h-2.5 w-2.5" /> {roleLabel(m.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ws ? (
                      <Link to="/$workspace" params={{ workspace: ws.id }} className="inline-flex items-center gap-1 text-primary hover:opacity-80 text-xs">
                        {ws.name} <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : <span className="text-muted-foreground text-xs">All workspaces</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{area?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[9px] font-semibold uppercase tracking-wide",
                      m.status === "active" ? "bg-success/20 text-success" : m.status === "invited" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground")}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.joinedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {m.role !== "admin" && (
                        <>
                          <button onClick={() => openEdit(m)} title="Edit access"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onRemove(m.id)} title="Remove"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {m.role === "admin" && (
                        <span className="text-[10px] text-muted-foreground px-1">Protected</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit access modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold">Edit Access</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{editing.name} · {editing.email}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role, keyAreaId: "" })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="ocp">OCP – Event President</option>
                  <option value="ocvp">OCVP – Vice President</option>
                  <option value="oc">OC – Key Area Member</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Workspace</label>
                <select value={editForm.workspaceId} onChange={(e) => setEditForm({ ...editForm, workspaceId: e.target.value, keyAreaId: "" })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">All (admin-level)</option>
                  {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              {editForm.role === "oc" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Key Area</label>
                  <select value={editForm.keyAreaId} onChange={(e) => setEditForm({ ...editForm, keyAreaId: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">None (workspace-wide)</option>
                    {filteredKeyAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary transition">Cancel</button>
              <button onClick={handleEditSave} className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition">Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add member modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elegant max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Add Member</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              {[["name", "Full Name", "text"], ["email", "Email", "email"], ["password", "Initial Password", "text"]].map(([k, l, t]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{l}</label>
                  <input type={t} value={(addForm as any)[k]} onChange={(e) => setAddForm({ ...addForm, [k]: e.target.value })}
                    placeholder={k === "password" ? "min. 8 characters — share with the member" : undefined}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value as Role, keyAreaId: "", workspaceId: "" })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="admin">Admin – Full access (protected)</option>
                  <option value="ocp">OCP – Event President</option>
                  <option value="ocvp">OCVP – Vice President</option>
                  <option value="oc">OC – Key Area Member</option>
                </select>
              </div>
              {addForm.role !== "admin" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Workspace</label>
                  <select value={addForm.workspaceId} onChange={(e) => setAddForm({ ...addForm, workspaceId: e.target.value, keyAreaId: "" })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Select workspace…</option>
                    {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}
              {addForm.role === "oc" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Key Area</label>
                  <select value={addForm.keyAreaId} onChange={(e) => setAddForm({ ...addForm, keyAreaId: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">None (workspace-wide)</option>
                    {filteredKeyAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary transition">Cancel</button>
              <button onClick={handleAdd} className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition">Add member</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Validations Tab ──────────────────────────────────────────────────────────
function ValidationsTab({
  pendingLeads,
  allLeads,
  onPersistLeads,
}: {
  pendingLeads: any[];
  allLeads: any[];
  onPersistLeads: (updated: any[]) => void;
}) {
  const { push } = useNotifications();
  const { managedUsers } = useAuth();

  const validate = (lead: any) => {
    const updated = allLeads.map((l: any) =>
      l.id === lead.id ? { ...l, pendingValidation: false, validated: true } : l,
    );
    onPersistLeads(updated);

    // Notify the member who submitted the lead. The submitter is a managed user
    // (their id === lead.assigneeId); resolve the role for correct targeting.
    if (lead.assigneeId) {
      const submitter = managedUsers.find((m) => m.id === lead.assigneeId);
      push({
        type: "lead_validated",
        title: "Your lead was validated!",
        message: `"${lead.company}" has been approved by admin. You can now progress it in the pipeline.`,
        leadId: lead.id,
        targetRole: submitter?.role ?? "oc",
        targetUserId: lead.assigneeId,
        workspaceId: lead.workspaceId,
      });
    }
    toast.success(`${lead.company} validated`);
  };

  const reject = (lead: any) => {
    const updated = allLeads.map((l: any) =>
      l.id === lead.id ? { ...l, pendingValidation: false, validated: false, stage: "lost" } : l,
    );
    onPersistLeads(updated);

    // Let the submitter know their lead was not approved.
    if (lead.assigneeId) {
      const submitter = managedUsers.find((m) => m.id === lead.assigneeId);
      push({
        type: "lead_rejected",
        title: "Lead not approved",
        message: `"${lead.company}" was not approved by admin and moved to Lost.`,
        leadId: lead.id,
        targetRole: submitter?.role ?? "oc",
        targetUserId: lead.assigneeId,
        workspaceId: lead.workspaceId,
      });
    }
    toast.success(`${lead.company} rejected — moved to Lost`);
  };

  if (pendingLeads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ShieldCheck className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">All leads validated</p>
        <p className="text-xs mt-1">No leads are currently awaiting admin approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        {pendingLeads.length} lead{pendingLeads.length !== 1 ? "s" : ""} awaiting your review.
      </p>
      {pendingLeads.map((lead: any) => {
        const ws = workspaces.find((w) => w.id === lead.workspaceId);
        return (
          <div key={lead.id} className="rounded-2xl border border-warning/30 bg-warning/5 p-5 flex items-start gap-4">
            <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{lead.company}</span>
                <span className="text-[11px] text-muted-foreground">{lead.industry}</span>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {ws?.name ?? lead.workspaceId}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Submitted by <span className="font-medium text-foreground">{lead.assignee?.name ?? "Unknown"}</span>
                {" · "}{lead.updatedAt}
              </div>
              <div className="mt-1 text-xs">
                Interest: <span className="font-medium">{lead.interest}</span>
                {" · "}Value: <span className="font-mono font-medium">{(lead.value / 1000).toFixed(0)}k TND</span>
                {" · "}Probability: <span className="font-medium">{lead.probability}%</span>
              </div>
              {lead.notes && (
                <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 italic">"{lead.notes}"</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => validate(lead)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition"
              >
                <ShieldCheck className="h-3 w-3" /> Validate
              </button>
              <button
                onClick={() => reject(lead)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
              >
                <XCircle className="h-3 w-3" /> Reject
              </button>
              <Link
                to="/$workspace/sales"
                params={{ workspace: lead.workspaceId }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition"
              >
                <Eye className="h-3 w-3" /> View
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Content Reviews Tab ──────────────────────────────────────────────────────
function ReviewsTab({
  reviewTasks,
  allTasks,
  onPersistTasks,
}: {
  reviewTasks: any[];
  allTasks: any[];
  onPersistTasks: (updated: any[]) => void;
}) {
  const { push } = useNotifications();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function approveTask(task: any) {
    const updated = allTasks.map((t: any) =>
      t.id === task.id ? { ...t, status: "done", rejectionReason: undefined } : t,
    );
    onPersistTasks(updated);
    push({
      type: "review_approved",
      title: "Content approved!",
      message: `Your submission "${task.title}" has been approved and marked as done.`,
      taskId: task.id,
      targetRole: "oc",
      targetUserId: task.assigneeId,
      workspaceId: task.workspaceId,
    });
    toast.success(`"${task.title}" approved`);
  }

  function rejectTask(task: any) {
    if (!rejectReason.trim()) { toast.error("Please provide a reason."); return; }
    const updated = allTasks.map((t: any) =>
      t.id === task.id ? { ...t, status: "review", rejectionReason: rejectReason.trim() } : t,
    );
    onPersistTasks(updated);
    push({
      type: "review_rejected",
      title: "Revision requested",
      message: `Your submission "${task.title}" needs revision: ${rejectReason.trim()}`,
      taskId: task.id,
      targetRole: "oc",
      targetUserId: task.assigneeId,
      workspaceId: task.workspaceId,
    });
    toast.success("Revision requested");
    setRejectingId(null);
    setRejectReason("");
  }

  if (reviewTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">No submissions awaiting review</p>
        <p className="text-xs mt-1">All content has been reviewed or there's nothing to approve yet.</p>
      </div>
    );
  }

  const areaColors: Record<string, string> = {
    marketing: "bg-orange-500/10 text-orange-600",
    content:   "bg-violet-500/10 text-violet-600",
    pr:        "bg-cyan-500/10 text-cyan-600",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        {reviewTasks.length} submission{reviewTasks.length !== 1 ? "s" : ""} awaiting your review.
      </p>
      {reviewTasks.map((task: any) => {
        const ws = workspaces.find((w) => w.id === task.workspaceId);
        return (
          <div key={task.id} className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 flex items-start gap-4">
            <FileText className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{task.title}</span>
                {task.areaId && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", areaColors[task.areaId] ?? "bg-muted text-muted-foreground")}>
                    {task.areaId}
                  </span>
                )}
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {ws?.name ?? task.workspaceId}
                </span>
              </div>
              {task.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              {task.reviewLink && (
                <a
                  href={task.reviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> View submitted work
                </a>
              )}
              {task.rejectionReason && (
                <p className="mt-1.5 text-[11px] text-destructive italic">
                  Previous feedback: "{task.rejectionReason}"
                </p>
              )}
              {rejectingId === task.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Describe what needs to be changed…"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => rejectTask(task)}
                      className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition"
                    >
                      Confirm rejection
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => approveTask(task)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition"
              >
                <CheckCircle2 className="h-3 w-3" /> Approve
              </button>
              <button
                onClick={() => { setRejectingId(task.id); setRejectReason(""); }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
              >
                <XCircle className="h-3 w-3" /> Request revision
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PM Tasks Tab ─────────────────────────────────────────────────────────────
function PmTasksTab({ tasks, onPersist }: { tasks: PmTask[]; onPersist: (u: PmTask[]) => void }) {
  const { push } = useNotifications();
  const { managedUsers } = useAuth();
  const [filterWs, setFilterWs] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterWs !== "all" && t.workspaceId !== filterWs) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterWs, filterStatus]);

  function publishTask(task: PmTask) {
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, status: "todo" as const, publishedAt: now } : t,
    );
    onPersist(updated);

    // Notify assignees — target the real member accounts (managed users), not
    // the static admin-only workspaceMembers list.
    if (task.assignedTo === "all") {
      managedUsers
        .filter((m) => m.workspaceId === task.workspaceId)
        .forEach((m) => {
          push({
            type: "task_assigned",
            title: "New task assigned",
            message: `"${task.title}" was published and assigned to all members.`,
            taskId: task.id,
            targetRole: m.role,
            targetUserId: m.id,
            workspaceId: task.workspaceId,
          });
        });
    } else {
      const member = managedUsers.find((m) => m.id === task.assignedTo);
      if (member) {
        push({
          type: "task_assigned",
          title: "New task assigned to you",
          message: `"${task.title}" was published by admin.`,
          taskId: task.id,
          targetRole: member.role,
          targetUserId: member.id,
          workspaceId: task.workspaceId,
        });
      }
    }
    toast.success("Task published & members notified");
  }

  function deleteTask(id: string) {
    onPersist(tasks.filter((t) => t.id !== id));
    toast.success("Task deleted");
  }

  const priorityCls: Record<PmTask["priority"], string> = {
    low:    "bg-muted text-muted-foreground",
    medium: "bg-info/15 text-info",
    high:   "bg-warning/15 text-warning",
    urgent: "bg-destructive/15 text-destructive",
  };
  const statusCls: Record<PmTask["status"], string> = {
    draft:       "bg-muted/40 text-muted-foreground",
    todo:        "bg-info/10 text-info",
    in_progress: "bg-warning/10 text-warning",
    done:        "bg-success/10 text-success",
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {[{ id: "all", name: "All workspaces" }, ...workspaces.filter(w => w.type === "department")].map((w) => (
            <button key={w.id} onClick={() => setFilterWs(w.id)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filterWs === w.id ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white" : "border border-border text-muted-foreground hover:text-foreground")}>
              {w.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap ml-auto">
          {["all", "draft", "todo", "in_progress", "done"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition",
                filterStatus === s ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-white" : "border border-border text-muted-foreground hover:text-foreground")}>
              {s === "all" ? "All statuses" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No PM tasks match this filter.</div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                {["Task", "Workspace", "Assignee", "Priority", "Status", "Due", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const ws = workspaces.find((w) => w.id === t.workspaceId);
                return (
                  <tr key={t.id} className="border-b border-border/40 hover:bg-secondary/20 transition">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-sm truncate">{t.title}</div>
                      {t.description && <div className="text-[11px] text-muted-foreground truncate mt-0.5">{t.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{ws?.name ?? t.workspaceId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        {t.assignedTo !== "all" && <Avatar name={t.assignedToName} hue={t.assignedToHue ?? 200} size={20} />}
                        <span className="text-muted-foreground">{t.assignedToName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", priorityCls[t.priority])}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", statusCls[t.status])}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {t.status === "draft" && (
                          <button onClick={() => publishTask(t)} title="Publish"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-success/10 hover:text-success transition">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => deleteTask(t.id)} title="Delete"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ stats, pmTasks, allLeads, allTasks }: { stats: Record<string, number>; pmTasks: PmTask[]; allLeads: any[]; allTasks: any[] }) {
  const wsBreakdown = workspaces.map((ws) => {
    const wsTasks = allTasks.filter((t: any) => (t.workspace_id ?? t.workspaceId) === ws.id);
    const wsLeads = allLeads.filter((l: any) => (l.workspace_id ?? l.workspaceId) === ws.id);
    const confirmedLeads = wsLeads.filter((l: any) => l.stage === "confirmed");
    const revenue = confirmedLeads.reduce((s: number, l: any) => {
      const sd = l.stageData ?? l.stage_data;
      return s + Number(sd?.confirmed?.amount ?? l.value ?? 0);
    }, 0);
    const done = wsTasks.filter((t: any) => t.status === "done").length;
    const pct = wsTasks.length > 0 ? Math.round((done / wsTasks.length) * 100) : 0;
    const wsPmTasks = pmTasks.filter((t) => t.workspaceId === ws.id);
    const pmDone = wsPmTasks.filter((t) => t.status === "done").length;
    return { ...ws, taskTotal: wsTasks.length, taskDone: done, pct, leads: wsLeads.length, revenue, pmTotal: wsPmTasks.length, pmDone };
  });

  return (
    <div className="space-y-6">
      {/* Workspace breakdown */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Workspace overview</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {wsBreakdown.map((ws) => (
            <div key={ws.id} className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br font-display text-sm font-bold text-white", ws.color)}>
                  {ws.short}
                </div>
                <div>
                  <div className="font-semibold text-sm">{ws.name}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{ws.type}</div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Progress",         value: `${ws.progress}%` },
                  { label: "Area tasks",        value: `${ws.taskDone}/${ws.taskTotal}` },
                  { label: "Task completion",   value: `${ws.pct}%` },
                  ...(ws.type === "event" ? [
                    { label: "Leads", value: String(ws.leads) },
                    { label: "Revenue (TND)", value: ws.revenue > 0 ? ws.revenue.toLocaleString() : "0" },
                  ] : []),
                  ...(ws.type === "department" ? [{ label: "PM tasks", value: `${ws.pmDone}/${ws.pmTotal}` }] : []),
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-mono font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${ws.pct}%` }} />
              </div>
              <Link to="/$workspace" params={{ workspace: ws.id }}
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:opacity-80">
                Open workspace <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Key area task completion */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Key area task completion</h3>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-3">
          {keyAreas.map((area) => {
            const areaTasks = allTasks.filter((t: any) => t.areaId === area.id);
            const done = areaTasks.filter((t: any) => t.status === "done").length;
            const total = areaTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={area.id} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-xs text-muted-foreground">{area.name}</div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted/50">
                  <div className="h-full rounded-md bg-gradient-to-r from-cyan-500/60 to-emerald-500/40" style={{ width: `${pct}%` }} />
                  <span className="absolute inset-y-0 left-3 inline-flex items-center text-[11px] font-medium">{pct}%</span>
                  <span className="absolute inset-y-0 right-2 inline-flex items-center font-mono text-[11px] text-foreground/60">{done}/{total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Member performance */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Member performance</h3>
        <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-cyan-500/5">
                {["Member", "Workspace", "Key Area", "Tasks done", "In progress", "Tasks total", "Completion"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workspaceMembers.map((m) => {
                const memberTasks = allTasks.filter((t: any) => t.assigneeId === m.id || t.assignee?.id === m.id);
                const done = memberTasks.filter((t: any) => t.status === "done").length;
                const inProgress = memberTasks.filter((t: any) => t.status === "in_progress").length;
                const total = memberTasks.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const ws = workspaces.find((w) => w.id === m.workspaceId);
                const area = keyAreas.find((a) => a.id === m.keyAreaId);
                return (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-secondary/20 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.name} hue={m.hue} size={28} />
                        <div>
                          <div className="text-xs font-medium">{m.name}</div>
                          <div className="text-[10px] text-muted-foreground">{roleLabel(m.role)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{ws?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{area?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-emerald-600 font-semibold">{done}</td>
                    <td className="px-4 py-3 text-xs font-mono text-warning">{inProgress}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PM Tasks breakdown */}
      <div>
        <h3 className="text-sm font-semibold mb-3">PM Tasks by status</h3>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(["draft", "todo", "in_progress", "done"] as PmTask["status"][]).map((s) => {
              const count = pmTasks.filter((t) => t.status === s).length;
              const clsMap = { draft: "text-muted-foreground", todo: "text-info", in_progress: "text-warning", done: "text-success" };
              return (
                <div key={s} className="rounded-xl border border-border/40 bg-background/60 p-3 text-center">
                  <div className={cn("font-display text-2xl font-semibold", clsMap[s])}>{count}</div>
                  <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{s.replace("_", " ")}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Goals Tab ──────────────────────────────────────────────────────────────
function GoalsTab() {
  const [goals, setGoals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventGoals()
      .then((g) => {
        setGoals(g);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveGoal = (workspaceId: string, amount: number) => {
    setEventGoal({ data: { workspaceId, goal: amount } })
      .then(() => {
        setGoals((prev) => ({ ...prev, [workspaceId]: amount }));
        toast.success(`Goal for ${workspaceId === "tedx" ? "TEDx" : "MeetupPro"} updated to ${amount.toLocaleString()} TND`);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to update goal");
      });
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading goals...</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-sm font-semibold mb-1">Monetary Goals</h3>
        <p className="text-xs text-muted-foreground">Set the target budget/revenue goal for each event workspace.</p>
      </div>

      <div className="grid gap-4">
        {[
          { id: "tedx", name: "TEDx", color: "from-fuchsia-500 to-rose-500" },
          { id: "meetup", name: "MeetupPro", color: "from-violet-500 to-indigo-500" },
        ].map((ws) => {
          const currentGoal = goals[ws.id] || 0;
          return (
            <div key={ws.id} className="rounded-2xl border border-border/60 bg-card/60 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br font-display text-sm font-bold text-white", ws.color)}>
                  {ws.id === "tedx" ? "TX" : "MP"}
                </div>
                <div>
                  <div className="font-semibold text-sm">{ws.name}</div>
                  <div className="text-[11px] text-muted-foreground">Workspace Goal</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    defaultValue={currentGoal}
                    placeholder="0"
                    id={`goal-input-${ws.id}`}
                    className="h-9 w-36 rounded-lg border border-border bg-background/60 pl-3 pr-12 text-sm font-mono focus:border-primary focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground font-medium">TND</span>
                </div>
                <button
                  onClick={() => {
                    const inputEl = document.getElementById(`goal-input-${ws.id}`) as HTMLInputElement;
                    if (inputEl) {
                      const val = Number(inputEl.value);
                      handleSaveGoal(ws.id, val);
                    }
                  }}
                  className="inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3.5 text-xs font-medium text-white hover:opacity-90 transition shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Talks & Panels Tab ────────────────────────────────────────────────────────
function TalksTab() {
  const [talks, setTalks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("tedx");
  const [type, setType] = useState<"talk" | "panel">("talk");

  useEffect(() => {
    getTalks()
      .then((t) => {
        setTalks(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    upsertTalk({ data: { workspaceId, name: name.trim(), type } })
      .then((res) => {
        setTalks((prev) => [
          ...prev,
          { id: res.id, workspaceId, name: name.trim(), type },
        ]);
        setName("");
        toast.success("Added successfully");
      })
      .catch(() => toast.error("Failed to add"));
  };

  const handleDelete = (id: string) => {
    deleteTalk({ data: { id } })
      .then(() => {
        setTalks((prev) => prev.filter((t) => t.id !== id));
        toast.success("Deleted successfully");
      })
      .catch(() => toast.error("Failed to delete"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Talks & Panels Configuration</h3>
        <p className="text-xs text-muted-foreground">Manage the list of talks (TEDx) or panels (MeetupPro) for speakers to choose from.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-4">
          <h4 className="font-semibold text-sm">Add New Entry</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Workspace</label>
              <select
                value={workspaceId}
                onChange={(e) => {
                  setWorkspaceId(e.target.value);
                  setType(e.target.value === "tedx" ? "talk" : "panel");
                }}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              >
                <option value="tedx">TEDx</option>
                <option value="meetup">MeetupPro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "talk" | "panel")}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              >
                <option value="talk">Talk (TEDx)</option>
                <option value="panel">Panel (MeetupPro)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Name / Title</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AI in Education"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <button
              onClick={handleAdd}
              className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-xs font-medium text-white hover:opacity-90 transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </button>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Workspace</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">Loading...</td>
                </tr>
              ) : talks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">No entries configured yet.</td>
                </tr>
              ) : (
                talks.map((t, idx) => (
                  <tr key={t.id} className={cn("border-b border-border/40 hover:bg-secondary/20 transition", idx % 2 !== 0 && "bg-secondary/10")}>
                    <td className="px-4 py-3 text-xs font-semibold capitalize">{t.workspaceId === "tedx" ? "TEDx" : "MeetupPro"}</td>
                    <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{t.type}</td>
                    <td className="px-4 py-3 text-xs font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

