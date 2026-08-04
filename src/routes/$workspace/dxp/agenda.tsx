import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { agendaItems, type AgendaItem } from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, X, CheckCircle2, AlertCircle, GripVertical, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/dxp/agenda")({
  component: AgendaPage,
});

const STORAGE = "nucleus_dxp_agenda";

const typeConfig = {
  keynote: { label: "Keynote", color: "bg-primary/10 text-primary ring-primary/30" },
  workshop: { label: "Workshop", color: "bg-accent/10 text-accent ring-accent/30" },
  break: { label: "Break", color: "bg-muted/60 text-muted-foreground ring-border" },
  networking: { label: "Networking", color: "bg-success/10 text-success ring-success/30" },
  opening: { label: "Opening", color: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/30" },
  closing: { label: "Closing", color: "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/30" },
  panel: { label: "Panel", color: "bg-warning/10 text-warning ring-warning/30" },
};

function AgendaPage() {
  const { workspace } = Route.useParams();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin || user?.role === "ocp" || user?.role === "ocvp" || (user?.role === "oc" && user?.keyAreaId === "dxp");

  const [items, setItems] = useState<AgendaItem[]>(() => {
    try { const s = localStorage.getItem(STORAGE); if (s) return JSON.parse(s); } catch {}
    return agendaItems.filter((a) => a.workspaceId === workspace);
  });
  const save = (u: AgendaItem[]) => { setItems(u); localStorage.setItem(STORAGE, JSON.stringify(u)); };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [form, setForm] = useState({ time: "", duration: "20", title: "", speaker: "", type: "keynote" as AgendaItem["type"], location: "", notes: "", confirmed: false });

  const openNew = () => { setEditing(null); setForm({ time: "", duration: "20", title: "", speaker: "", type: "keynote", location: "", notes: "", confirmed: false }); setShowForm(true); };
  const openEdit = (a: AgendaItem) => { setEditing(a); setForm({ time: a.time, duration: String(a.duration), title: a.title, speaker: a.speaker ?? "", type: a.type, location: a.location, notes: a.notes, confirmed: a.confirmed }); setShowForm(true); };

  const handleSubmit = () => {
    if (!form.time || !form.title) { toast.error("Time and title required."); return; }
    if (editing) {
      save(items.map((i) => i.id === editing.id ? { ...editing, ...form, duration: Number(form.duration), speaker: form.speaker || undefined } : i));
      toast.success("Session updated.");
    } else {
      const item: AgendaItem = { id: `AG-${Date.now()}`, workspaceId: workspace, ...form, duration: Number(form.duration), speaker: form.speaker || undefined };
      save([...items, item].sort((a, b) => a.time.localeCompare(b.time)));
      toast.success("Session added.");
    }
    setShowForm(false);
  };

  const toggleConfirmed = (id: string) => {
    if (!canEdit) return;
    save(items.map((i) => i.id === id ? { ...i, confirmed: !i.confirmed } : i));
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete."); return; }
    save(items.filter((i) => i.id !== id));
  };

  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time));
  const confirmed = sorted.filter((i) => i.confirmed).length;
  const totalMinutes = items.reduce((s, i) => s + i.duration, 0);

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Agenda Draft</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sorted.length} sessions · {Math.floor(totalMinutes / 60)}h{totalMinutes % 60 > 0 ? `${totalMinutes % 60}min` : ""} total · {confirmed}/{sorted.length} confirmed
          </p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Add Session
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(["keynote", "workshop", "break", "networking"] as AgendaItem["type"][]).map((t) => {
          const count = items.filter((i) => i.type === t).length;
          const { label, color } = typeConfig[t];
          return (
            <div key={t} className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center gap-3">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", color)}>{label}</span>
              <span className="text-lg font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative space-y-1">
        <div className="absolute left-16 top-0 bottom-0 w-px bg-border/40" />
        {sorted.map((item) => {
          const { label, color } = typeConfig[item.type];
          return (
            <div key={item.id} className={cn("flex gap-4 group rounded-xl p-3 transition hover:bg-sidebar-accent/20", !item.confirmed && "opacity-70")}>
              <div className="w-12 shrink-0 text-right">
                <span className="text-xs font-mono text-muted-foreground">{item.time}</span>
              </div>
              <div className="relative pl-6">
                <div className={cn("absolute left-0 top-1.5 h-3 w-3 rounded-full ring-2 ring-background", item.confirmed ? "bg-success" : "bg-border")} />
                <div className="flex items-start gap-2 flex-wrap">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", color)}>{label}</span>
                  {!item.confirmed && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-warning/10 text-warning ring-1 ring-warning/30"><AlertCircle className="h-2.5 w-2.5 inline mr-0.5" />TBC</span>}
                </div>
                <div className="font-medium text-sm mt-1">{item.title}</div>
                {item.speaker && <div className="text-xs text-muted-foreground">{item.speaker}</div>}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.duration}min</span>
                  {item.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>}
                </div>
                {item.notes && <div className="mt-1 text-xs text-muted-foreground italic">{item.notes}</div>}
              </div>
              {canEdit && (
                <div className="ml-auto flex items-start gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => toggleConfirmed(item.id)} title={item.confirmed ? "Mark TBC" : "Confirm"} className="rounded-lg p-1.5 hover:bg-sidebar-accent/60 text-muted-foreground">
                    <CheckCircle2 className={cn("h-4 w-4", item.confirmed ? "text-success" : "")} />
                  </button>
                  <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 hover:bg-sidebar-accent/60 text-muted-foreground text-xs px-2">Edit</button>
                  {isAdmin && <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 hover:bg-destructive/10 text-destructive text-xs px-2">Del</button>}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No agenda sessions added yet.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="font-display font-semibold mb-4">{editing ? "Edit Session" : "Add Session"}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["time", "Time", "time"], ["duration", "Duration (min)", "number"]].map(([k, l, t]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{l}</label>
                    <input type={t} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {[["title", "Session Title"], ["speaker", "Speaker / Facilitator"], ["location", "Location"], ["notes", "Notes"]].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{l}</label>
                  <input value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} className="rounded" />
                Confirmed
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
              <button onClick={handleSubmit} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
