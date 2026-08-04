import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { oneToOnes, workspaceMembers, type OneToOne } from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, X, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar } from "@/components/app/avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/dxp/one2one")({
  component: OneToOnePage,
});

const STORAGE = "nucleus_dxp_o2o";
const statusColor = { scheduled: "text-info bg-info/10 ring-info/30", done: "text-success bg-success/10 ring-success/30", cancelled: "text-destructive bg-destructive/10 ring-destructive/30" };

function OneToOnePage() {
  const { workspace } = Route.useParams();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin || user?.role === "ocp" || user?.role === "ocvp" || (user?.role === "oc" && user?.keyAreaId === "dxp");

  const wsMembers = workspaceMembers.filter((m) => (m.workspaceId === workspace || m.role === "admin") && m.role !== "admin");

  const [items, setItems] = useState<OneToOne[]>(() => {
    try { const s = localStorage.getItem(STORAGE); if (s) return JSON.parse(s); } catch {}
    return oneToOnes.filter((o) => o.workspaceId === workspace);
  });
  const save = (u: OneToOne[]) => { setItems(u); localStorage.setItem(STORAGE, JSON.stringify(u)); };

  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ memberId: "", date: "", time: "", duration: "30", agenda: "", notes: "", actionItem: "", status: "scheduled" as OneToOne["status"] });
  const [actionItems, setActionItems] = useState<string[]>([]);

  const openNew = () => {
    setForm({ memberId: wsMembers[0]?.id ?? "", date: "", time: "", duration: "30", agenda: "", notes: "", actionItem: "", status: "scheduled" });
    setActionItems([]);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.memberId || !form.date || !form.time) { toast.error("Member, date and time required."); return; }
    const member = wsMembers.find((m) => m.id === form.memberId);
    if (!member) return;
    const o: OneToOne = {
      id: `OTO-${Date.now()}`, workspaceId: workspace,
      memberId: form.memberId, memberName: member.name, memberHue: member.hue,
      date: form.date, time: form.time, duration: Number(form.duration),
      agenda: form.agenda, notes: form.notes, status: form.status, actionItems,
    };
    save([...items, o]);
    toast.success("1-on-1 scheduled.");
    setShowForm(false);
  };

  const toggleStatus = (id: string, status: OneToOne["status"]) => {
    save(items.map((i) => i.id === id ? { ...i, status } : i));
    toast.success("Status updated.");
  };

  const deleteItem = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete."); return; }
    save(items.filter((i) => i.id !== id));
  };

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-semibold">1-on-1 Meetings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Individual check-ins with each OC member</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Schedule 1-on-1
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sorted.map((o) => {
          const isOpen = expanded === o.id;
          return (
            <div key={o.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-sidebar-accent/20 transition" onClick={() => setExpanded(isOpen ? null : o.id)}>
                <Avatar name={o.memberName} hue={o.memberHue} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{o.memberName}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(o.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{o.time} · {o.duration}min</span>
                  </div>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1", statusColor[o.status])}>{o.status}</span>
                {canEdit && (
                  <select value={o.status} onChange={(e) => { e.stopPropagation(); toggleStatus(o.id, e.target.value as any); }}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none" onClick={(e) => e.stopPropagation()}>
                    <option value="scheduled">Scheduled</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
              {isOpen && (
                <div className="border-t border-border/40 px-5 py-4 space-y-3">
                  {o.agenda && <div><div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Agenda</div><p className="text-sm">{o.agenda}</p></div>}
                  {o.notes && <div><div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Notes</div><p className="text-sm text-muted-foreground">{o.notes}</p></div>}
                  {o.actionItems.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Action Items</div>
                      <div className="space-y-1">
                        {o.actionItems.map((ai, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />{ai}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isAdmin && (
                    <button onClick={() => deleteItem(o.id)} className="text-xs text-destructive hover:underline">Delete</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No 1-on-1 meetings scheduled yet.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="font-display font-semibold mb-4">Schedule 1-on-1</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Member</label>
                <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {wsMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["date", "Date", "date"], ["time", "Time", "time"], ["duration", "Duration (min)", "number"]].map(([k, l, t]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{l}</label>
                    <input type={t} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Agenda</label>
                <textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Action Items</label>
                <div className="space-y-1 mb-2">
                  {actionItems.map((ai, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-success" /><span className="flex-1">{ai}</span>
                      <button onClick={() => setActionItems(actionItems.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={form.actionItem} onChange={(e) => setForm({ ...form, actionItem: e.target.value })}
                    placeholder="Add action item..." onKeyDown={(e) => { if (e.key === "Enter" && form.actionItem.trim()) { setActionItems([...actionItems, form.actionItem.trim()]); setForm({ ...form, actionItem: "" }); }}}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button onClick={() => { if (form.actionItem.trim()) { setActionItems([...actionItems, form.actionItem.trim()]); setForm({ ...form, actionItem: "" }); }}}
                    className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">Add</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
              <button onClick={handleSubmit} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
