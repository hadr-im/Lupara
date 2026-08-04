import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import {
  workspaceMembers,
  tasks,
  keyAreas,
  workspaces,
  type WorkspaceMember,
} from "@/lib/mock/data";
import { useAuth, roleLabel } from "@/lib/auth-context";
import { Plus, Search, Users, CheckCircle2, Clock, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/team")({
  component: TeamPage,
});

const roleColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary ring-primary/30",
  ocp: "bg-accent/10 text-accent ring-accent/30",
  ocvp: "bg-info/10 text-info ring-info/30",
  oc: "bg-muted text-muted-foreground ring-border",
};

const statusColors: Record<string, string> = {
  active: "bg-success text-success-foreground",
  invited: "bg-warning text-warning-foreground",
  inactive: "bg-muted text-muted-foreground",
};

function TeamPage() {
  const { workspace } = Route.useParams();
  const { user, isAdmin } = useAuth();

  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace.toUpperCase();

  const [query, setQuery] = useState("");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [showInvite, setShowInvite] = useState(false);

  const members = useMemo(
    () =>
      workspaceMembers.filter(
        (m) => m.workspaceId === workspace || m.role === "admin",
      ),
    [workspace],
  );

  const filtered = useMemo(() => {
    let result = members;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q),
      );
    }
    if (filterArea !== "all") {
      result = result.filter((m) => m.keyAreaId === filterArea || m.role === "admin" || m.role === "ocp" || m.role === "ocvp");
    }
    return result;
  }, [members, query, filterArea]);

  const wsTasks = useMemo(
    () => tasks.filter((t) => t.workspaceId === workspace),
    [workspace],
  );

  function getMemberStats(member: WorkspaceMember) {
    const assigned = wsTasks.filter((t) =>
      member.keyAreaId ? t.areaId === member.keyAreaId : true,
    );
    const done = assigned.filter((t) => t.status === "done").length;
    const inProgress = assigned.filter((t) => t.status === "in_progress").length;
    return { total: assigned.length, done, inProgress };
  }

  const areaOptions = [
    { id: "all", name: "All areas" },
    ...keyAreas,
  ];

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Team" }]}
        title="Team members"
        subtitle={`${members.length} members across ${wsName}`}
        action={
          isAdmin ? (
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-3 text-xs font-medium text-primary-foreground shadow-card hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Invite member
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="px-8 py-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="h-9 w-full rounded-lg border border-border bg-card/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {areaOptions.map((a) => (
            <button
              key={a.id}
              onClick={() => setFilterArea(a.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                filterArea === a.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-8 pb-4">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-3 max-w-lg">
          {[
            { label: "Total members", value: members.length, icon: Users },
            { label: "Active", value: members.filter((m) => m.status === "active").length, icon: CheckCircle2 },
            { label: "Invited", value: members.filter((m) => m.status === "invited").length, icon: Clock },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/60 p-3 flex items-center gap-2.5">
              <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-lg font-display font-semibold">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No members match your search</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((member) => {
              const stats = getMemberStats(member);
              const area = keyAreas.find((a) => a.id === member.keyAreaId);
              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl transition hover:border-primary/30 hover:shadow-[0_4px_16px_-8px_var(--primary)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={member.name} hue={member.hue} size={44} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-sm">{member.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                        roleColors[member.role],
                      )}
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {roleLabel(member.role)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground">
                      {area ? (
                        <span className="rounded-md bg-secondary px-1.5 py-0.5">{area.name}</span>
                      ) : (
                        <span className="text-muted-foreground/60">All areas</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex h-5 items-center rounded-full px-2 text-[9px] font-semibold uppercase tracking-wide",
                        statusColors[member.status],
                      )}
                    >
                      {member.status}
                    </span>
                  </div>

                  {stats.total > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
                      {[
                        { label: "Tasks", value: stats.total },
                        { label: "Done", value: stats.done },
                        { label: "Active", value: stats.inProgress },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <div className="font-mono text-sm font-semibold">{s.value}</div>
                          <div className="text-[10px] text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-[10px] text-muted-foreground">
                    Joined {member.joinedAt}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite panel */}
      {showInvite && (
        <InvitePanel onClose={() => setShowInvite(false)} workspace={workspace} />
      )}
    </>
  );
}

function InvitePanel({ onClose, workspace }: { onClose: () => void; workspace: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "oc",
    keyAreaId: "marketing",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const { addManagedUser } = useAuth();
  const { toast: t } = { toast: (msg: string) => {} }; // placeholder

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-border/60 bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <h2 className="font-display text-xl font-semibold">Invite member</h2>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim() || !form.email.trim()) return;
            addManagedUser({
              email: form.email,
              name: form.name,
              role: form.role as any,
              workspaceId: workspace,
              keyAreaId: form.role === "oc" ? form.keyAreaId : undefined,
              hue: Math.floor(Math.random() * 360),
              password: "demo",
              status: "invited",
              joinedAt: new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
            } as any);
            onClose();
          }}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex-1 space-y-4 p-5">
            <Field label="Full name *">
              <input required value={form.name} onChange={set("name")} placeholder="Jane Doe" className={inputCls} />
            </Field>
            <Field label="Email *">
              <input required type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" className={inputCls} />
            </Field>
            <Field label="Role">
              <select value={form.role} onChange={set("role")} className={inputCls}>
                <option value="ocp">OCP — Workspace lead</option>
                <option value="ocvp">OCVP — Vice president</option>
                <option value="oc">OC — Key area member</option>
              </select>
            </Field>
            {form.role === "oc" && (
              <Field label="Key area">
                <select value={form.keyAreaId} onChange={set("keyAreaId")} className={inputCls}>
                  {keyAreas.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </Field>
            )}
            <div className="rounded-xl border border-info/30 bg-info/10 p-3 text-xs text-info">
              An invitation email will be sent with temporary access. Default password: <code className="font-mono font-semibold">demo</code>
            </div>
          </div>
          <div className="flex gap-2 border-t border-border/60 p-4">
            <button type="button" onClick={onClose} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--gradient-primary)] text-sm font-medium text-primary-foreground hover:opacity-90">Send invite</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

const inputCls = "h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
