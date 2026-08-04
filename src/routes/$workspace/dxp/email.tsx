import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { emailTemplates, type EmailTemplate } from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, X, CheckCircle2, Edit3, Copy, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/dxp/email")({
  component: EmailPage,
});

const STORAGE = "nucleus_dxp_email";
const typeConfig = {
  invitation: { label: "Invitation", color: "bg-primary/10 text-primary ring-primary/30" },
  confirmation: { label: "Confirmation", color: "bg-success/10 text-success ring-success/30" },
  reminder: { label: "Reminder", color: "bg-warning/10 text-warning ring-warning/30" },
  dayof: { label: "Day-Of", color: "bg-accent/10 text-accent ring-accent/30" },
  followup: { label: "Follow-up", color: "bg-muted/60 text-muted-foreground ring-border" },
};

function EmailPage() {
  const { workspace } = Route.useParams();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin || user?.role === "ocp" || user?.role === "ocvp" || (user?.role === "oc" && user?.keyAreaId === "dxp");

  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    try { const s = localStorage.getItem(STORAGE); if (s) return JSON.parse(s); } catch {}
    return emailTemplates.filter((t) => t.workspaceId === workspace);
  });
  const save = (u: EmailTemplate[]) => { setTemplates(u); localStorage.setItem(STORAGE, JSON.stringify(u)); };

  const [active, setActive] = useState<EmailTemplate | null>(templates[0] ?? null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: "", type: "invitation" as EmailTemplate["type"], subject: "", preheader: "", body: "" });

  const openNew = () => { setEditing(null); setForm({ name: "", type: "invitation", subject: "", preheader: "", body: "" }); setShowForm(true); };
  const openEdit = (t: EmailTemplate) => { setEditing(t); setForm({ name: t.name, type: t.type, subject: t.subject, preheader: t.preheader, body: t.body }); setShowForm(true); };

  const handleSubmit = () => {
    if (!form.name || !form.subject || !form.body) { toast.error("Name, subject and body required."); return; }
    if (editing) {
      const updated = templates.map((t) => t.id === editing.id ? { ...editing, ...form, updatedAt: "just now" } : t);
      save(updated);
      setActive(updated.find((t) => t.id === editing.id) ?? null);
      toast.success("Template updated.");
    } else {
      const t: EmailTemplate = { id: `ET-${Date.now()}`, workspaceId: workspace, ...form, updatedAt: "just now", approved: false };
      save([...templates, t]);
      setActive(t);
      toast.success("Template created.");
    }
    setShowForm(false);
  };

  const toggleApproved = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can approve templates."); return; }
    const updated = templates.map((t) => t.id === id ? { ...t, approved: !t.approved } : t);
    save(updated);
    setActive(updated.find((t) => t.id === id) ?? null);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete."); return; }
    const filtered = templates.filter((t) => t.id !== id);
    save(filtered);
    setActive(filtered[0] ?? null);
  };

  const copyTemplate = (t: EmailTemplate) => {
    navigator.clipboard.writeText(`Subject: ${t.subject}\n\n${t.body}`).then(() => toast.success("Copied to clipboard!"));
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Template list sidebar */}
      <div className="w-64 shrink-0 border-r border-border/60 flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <span className="text-sm font-semibold">Templates</span>
          {canEdit && (
            <button onClick={openNew} className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary/20"><Plus className="h-3.5 w-3.5" /></button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {templates.map((t) => {
            const { label, color } = typeConfig[t.type];
            return (
              <button key={t.id} onClick={() => setActive(t)}
                className={cn("w-full text-left px-4 py-3 border-b border-border/30 hover:bg-sidebar-accent/30 transition", active?.id === t.id && "bg-sidebar-accent/60")}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{t.name}</span>
                  {t.approved && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", color)}>{label}</span>
              </button>
            );
          })}
          {templates.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">No templates yet.</div>}
        </div>
      </div>

      {/* Template preview */}
      <div className="flex-1 overflow-auto p-6">
        {active ? (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1", typeConfig[active.type].color)}>{typeConfig[active.type].label}</span>
                  {active.approved && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-success/10 text-success ring-1 ring-success/30"><CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" />Approved</span>}
                </div>
                <h2 className="font-display text-lg font-semibold">{active.name}</h2>
                <div className="text-xs text-muted-foreground mt-0.5">Updated {active.updatedAt}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyTemplate(active)} title="Copy" className="rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-sidebar-accent/40 flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" />Copy</button>
                {canEdit && <button onClick={() => openEdit(active)} className="rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-sidebar-accent/40 flex items-center gap-1.5"><Edit3 className="h-3.5 w-3.5" />Edit</button>}
                {isAdmin && (
                  <>
                    <button onClick={() => toggleApproved(active.id)} className={cn("rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition", active.approved ? "border border-warning/40 text-warning hover:bg-warning/5" : "bg-success/10 text-success hover:bg-success/20")}>
                      <CheckCircle2 className="h-3.5 w-3.5" />{active.approved ? "Revoke" : "Approve"}
                    </button>
                    <button onClick={() => handleDelete(active.id)} className="rounded-xl border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5"><X className="h-3.5 w-3.5" /></button>
                  </>
                )}
              </div>
            </div>

            {/* Email preview */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-sidebar-accent/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{active.subject}</span>
                </div>
                {active.preheader && <div className="text-xs text-muted-foreground mt-1 ml-6">{active.preheader}</div>}
              </div>
              <div className="px-6 py-5">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">{active.body}</pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-sm text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Select a template or create a new one.
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="font-display font-semibold mb-4">{editing ? "Edit Template" : "New Template"}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Subject Line</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Preheader Text</label>
                <input value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Body</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={10}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono" />
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
