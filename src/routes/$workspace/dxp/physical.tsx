import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { physicalAttractions, type PhysicalAttraction } from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, MapPin, Clock, Users, X, Building2, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/dxp/physical")({
  component: PhysicalPage,
});

const STORAGE = "nucleus_dxp_physical";
const statusConfig = {
  planning: { label: "Planning", icon: Circle, color: "text-info bg-info/10 ring-info/30" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-success bg-success/10 ring-success/30" },
  done: { label: "Done", icon: CheckCircle2, color: "text-muted-foreground bg-muted/40 ring-border" },
};

function PhysicalPage() {
  const { workspace } = Route.useParams();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin || user?.role === "ocp" || user?.role === "ocvp" || (user?.role === "oc" && user?.keyAreaId === "dxp");

  const [venues, setVenues] = useState<PhysicalAttraction[]>(() => {
    try { const s = localStorage.getItem(STORAGE); if (s) return JSON.parse(s); } catch {}
    return physicalAttractions.filter((p) => p.workspaceId === workspace);
  });

  const save = (updated: PhysicalAttraction[]) => {
    setVenues(updated);
    localStorage.setItem(STORAGE, JSON.stringify(updated));
  };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PhysicalAttraction | null>(null);
  const [form, setForm] = useState({ title: "", venue: "", address: "", date: "", time: "", capacity: "", description: "", setupNotes: "", status: "planning" as PhysicalAttraction["status"] });

  const openNew = () => { setEditing(null); setForm({ title: "", venue: "", address: "", date: "", time: "", capacity: "", description: "", setupNotes: "", status: "planning" }); setShowForm(true); };
  const openEdit = (p: PhysicalAttraction) => { setEditing(p); setForm({ title: p.title, venue: p.venue, address: p.address, date: p.date, time: p.time, capacity: String(p.capacity), description: p.description, setupNotes: p.setupNotes, status: p.status }); setShowForm(true); };

  const handleSubmit = () => {
    if (!form.title || !form.venue || !form.date) { toast.error("Title, venue and date are required."); return; }
    if (editing) {
      save(venues.map((v) => v.id === editing.id ? { ...editing, ...form, capacity: Number(form.capacity) } : v));
      toast.success("Venue updated.");
    } else {
      const newVenue: PhysicalAttraction = { id: `PA-${Date.now()}`, workspaceId: workspace, ...form, capacity: Number(form.capacity) };
      save([...venues, newVenue]);
      toast.success("Venue added.");
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete."); return; }
    save(venues.filter((v) => v.id !== id));
    toast.success("Venue removed.");
  };

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Physical Attraction</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Venues, locations and setup details for the event</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Add Venue
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {venues.map((v) => {
          const { label, icon: Icon, color } = statusConfig[v.status];
          return (
            <div key={v.id} className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{v.title}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3 shrink-0" />{v.venue}
                  </div>
                </div>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 shrink-0", color)}>
                  <Icon className="h-3 w-3" />{label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{v.address}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3 w-3 shrink-0" />{new Date(v.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {v.time}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3 w-3 shrink-0" />{v.capacity} capacity</div>
              </div>
              {v.description && <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>}
              {v.setupNotes && (
                <div className="rounded-xl bg-warning/5 border border-warning/20 px-3 py-2 text-xs text-warning">
                  <AlertCircle className="h-3 w-3 inline mr-1" />Setup: {v.setupNotes}
                </div>
              )}
              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEdit(v)} className="flex-1 rounded-lg border border-border/60 py-1.5 text-xs font-medium hover:bg-sidebar-accent/40 transition">Edit</button>
                  {isAdmin && <button onClick={() => handleDelete(v.id)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition">Delete</button>}
                </div>
              )}
            </div>
          );
        })}
        {venues.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sm text-muted-foreground">No venues added yet.</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="font-display font-semibold mb-4">{editing ? "Edit Venue" : "Add Venue"}</h3>
            <div className="space-y-3">
              {[["title", "Title"], ["venue", "Venue Name"], ["address", "Address"], ["date", "Date", "date"], ["time", "Time", "time"], ["capacity", "Capacity", "number"], ["description", "Description"], ["setupNotes", "Setup Notes"]].map(([key, label, type = "text"]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="planning">Planning</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                </select>
              </div>
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
