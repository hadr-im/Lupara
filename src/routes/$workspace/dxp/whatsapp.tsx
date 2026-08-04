import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { whatsappTimeline, type WhatsAppMessage } from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, X, Send, Clock, CheckCircle2, MessageSquare, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/dxp/whatsapp")({
  component: WhatsAppPage,
});

const STORAGE = "nucleus_dxp_whatsapp";
const typeConfig = {
  welcome: { label: "Welcome", color: "bg-success/10 text-success ring-success/30" },
  reminder: { label: "Reminder", color: "bg-warning/10 text-warning ring-warning/30" },
  update: { label: "Update", color: "bg-info/10 text-info ring-info/30" },
  info: { label: "Info", color: "bg-accent/10 text-accent ring-accent/30" },
  dayof: { label: "Day-Of", color: "bg-primary/10 text-primary ring-primary/30" },
};

function WhatsAppPage() {
  const { workspace } = Route.useParams();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin || user?.role === "ocp" || user?.role === "ocvp" || (user?.role === "oc" && user?.keyAreaId === "dxp");

  const [messages, setMessages] = useState<WhatsAppMessage[]>(() => {
    try { const s = localStorage.getItem(STORAGE); if (s) return JSON.parse(s); } catch {}
    return whatsappTimeline.filter((m) => m.workspaceId === workspace);
  });
  const save = (u: WhatsAppMessage[]) => { setMessages(u); localStorage.setItem(STORAGE, JSON.stringify(u)); };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WhatsAppMessage | null>(null);
  const [active, setActive] = useState<WhatsAppMessage | null>(messages[0] ?? null);
  const [form, setForm] = useState({ title: "", scheduledDate: "", scheduledTime: "", type: "reminder" as WhatsAppMessage["type"], content: "" });

  const openNew = () => { setEditing(null); setForm({ title: "", scheduledDate: "", scheduledTime: "", type: "reminder", content: "" }); setShowForm(true); };
  const openEdit = (m: WhatsAppMessage) => { setEditing(m); setForm({ title: m.title, scheduledDate: m.scheduledDate, scheduledTime: m.scheduledTime, type: m.type, content: m.content }); setShowForm(true); };

  const handleSubmit = () => {
    if (!form.title || !form.scheduledDate || !form.content) { toast.error("Title, date and content required."); return; }
    if (editing) {
      const updated = messages.map((m) => m.id === editing.id ? { ...editing, ...form } : m);
      save(updated.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime)));
      setActive(updated.find((m) => m.id === editing.id) ?? null);
      toast.success("Message updated.");
    } else {
      const m: WhatsAppMessage = { id: `WA-${Date.now()}`, workspaceId: workspace, ...form, sent: false };
      const updated = [...messages, m].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime));
      save(updated);
      setActive(m);
      toast.success("Message scheduled.");
    }
    setShowForm(false);
  };

  const toggleSent = (id: string) => {
    if (!canEdit) return;
    const updated = messages.map((m) => m.id === id ? { ...m, sent: !m.sent, sentAt: !m.sent ? new Date().toISOString().slice(0, 16).replace("T", " ") : undefined } : m);
    save(updated);
    setActive(updated.find((m) => m.id === id) ?? null);
    toast.success(messages.find((m) => m.id === id)?.sent ? "Marked as unsent." : "Marked as sent.");
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete."); return; }
    const filtered = messages.filter((m) => m.id !== id);
    save(filtered);
    setActive(filtered[0] ?? null);
  };

  const sorted = [...messages].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime));
  const sentCount = messages.filter((m) => m.sent).length;

  return (
    <div className="flex h-full min-h-0">
      {/* List */}
      <div className="w-72 shrink-0 border-r border-border/60 flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <div>
            <span className="text-sm font-semibold">Message Timeline</span>
            <div className="text-xs text-muted-foreground">{sentCount}/{messages.length} sent</div>
          </div>
          {canEdit && (
            <button onClick={openNew} className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary/20"><Plus className="h-3.5 w-3.5" /></button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {sorted.map((m) => {
            const { label, color } = typeConfig[m.type];
            return (
              <button key={m.id} onClick={() => setActive(m)}
                className={cn("w-full text-left px-4 py-3 border-b border-border/30 hover:bg-sidebar-accent/30 transition", active?.id === m.id && "bg-sidebar-accent/60")}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium truncate">{m.title}</span>
                  {m.sent ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", color)}>{label}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.scheduledDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} {m.scheduledTime}</span>
                </div>
              </button>
            );
          })}
          {messages.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">No messages scheduled.</div>}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto p-6">
        {active ? (
          <div className="max-w-lg mx-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1", typeConfig[active.type].color)}>{typeConfig[active.type].label}</span>
                  {active.sent && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-success/10 text-success ring-1 ring-success/30"><CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" />Sent {active.sentAt}</span>}
                </div>
                <h2 className="font-display text-lg font-semibold">{active.title}</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />Scheduled {new Date(active.scheduledDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {active.scheduledTime}
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <>
                    <button onClick={() => openEdit(active)} className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-sidebar-accent/40"><Edit3 className="h-3.5 w-3.5" />Edit</button>
                    <button onClick={() => toggleSent(active.id)} className={cn("rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition", active.sent ? "border border-border hover:bg-sidebar-accent/40" : "bg-success/10 text-success hover:bg-success/20")}>
                      <Send className="h-3.5 w-3.5" />{active.sent ? "Unsend" : "Mark Sent"}
                    </button>
                  </>
                )}
                {isAdmin && <button onClick={() => handleDelete(active.id)} className="rounded-xl border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5"><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>

            {/* WhatsApp bubble preview */}
            <div className="rounded-2xl border border-border bg-[#e5ddd5] dark:bg-[#1e1e1e] p-4">
              <div className="text-xs text-muted-foreground text-center mb-4 font-medium"># TEDx Tunis 2025 Participants</div>
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] dark:bg-[#2a7a3a] px-4 py-2.5 shadow-sm">
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-[#1a1a1a] dark:text-white">{active.content}</pre>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-[#666] dark:text-white/60">{active.scheduledTime}</span>
                    <CheckCircle2 className="h-3 w-3 text-[#53bdeb]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-sm text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Select a message or schedule a new one.
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="font-display font-semibold mb-4">{editing ? "Edit Message" : "Schedule Message"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title (internal)</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                  <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Time</label>
                  <input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Message Content</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-sans" />
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
