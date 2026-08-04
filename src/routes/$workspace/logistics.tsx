import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import { workspaces, workspaceMembers } from "@/lib/mock/data";
import { getLogisticsItems, upsertLogisticsItem } from "@/lib/db/server-fns";
import type { LogisticsItem, LogisticsStageId } from "@/lib/types";
import { logisticsStages, LOGISTICS_STAGE_ORDER } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import { toast } from "sonner";
import {
  Plus, X, Search, Truck, Package, ShieldAlert, ShieldCheck,
  Building2, Phone, Mail, Tag, MessageCircle, ChevronRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/$workspace/logistics")({
  component: LogisticsPage,
});

const toneRing: Record<string, string> = {
  info: "ring-info/40", warning: "ring-warning/40",
  success: "ring-success/40", destructive: "ring-destructive/40",
};
const toneDot: Record<string, string> = {
  info: "bg-info", warning: "bg-warning", success: "bg-success", destructive: "bg-destructive",
};

function canMove(item: LogisticsItem, targetStage: LogisticsStageId, user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!user) return false;
  if (LOGISTICS_STAGE_ORDER[targetStage] <= LOGISTICS_STAGE_ORDER[item.stage]) return false;
  if (user.role === "admin") return true;
  if (user.role === "ocp" && user.workspaceId === item.workspaceId) return true;
  if (!item.validated) return false;
  if (user.workspaceId !== item.workspaceId) return false;
  return true;
}

function LogisticsPage() {
  const { workspace } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const { push } = useNotifications();

  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace.toUpperCase();

  const [items, setItems] = useState<LogisticsItem[]>([]);
  const itemsRef = useRef<LogisticsItem[]>([]);

  useEffect(() => {
    getLogisticsItems({ data: { workspaceId: workspace } })
      .then((rows) => { const d = rows as LogisticsItem[]; setItems(d); itemsRef.current = d; })
      .catch(() => {});
  }, [workspace]);

  const saveItems = useCallback((updated: LogisticsItem[]) => {
    const prev = itemsRef.current;
    itemsRef.current = updated;
    setItems(updated);
    for (const item of updated) {
      const old = prev.find((x) => x.id === item.id);
      if (!old || old.stage !== item.stage || old.validated !== item.validated ||
          old.pendingValidation !== item.pendingValidation) {
        upsertLogisticsItem({ data: {
          id: item.id, workspaceId: item.workspaceId ?? workspace,
          keyAreaId: item.keyAreaId, company: item.company,
          contact: item.contact, email: item.email, phone: item.phone,
          itemType: item.itemType, quantity: item.quantity,
          unit: item.unit, notes: item.notes, stage: item.stage,
          validated: item.validated, pendingValidation: item.pendingValidation,
          tags: item.tags,
        }}).catch(console.error);
      }
    }
  }, [workspace]);

  const [query, setQuery] = useState("");
  const [activeItem, setActiveItem] = useState<LogisticsItem | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ itemId: string; targetStage: LogisticsStageId } | null>(null);

  const visible = useMemo(() => {
    const ws = items.filter((i) => i.workspaceId === workspace);
    if (!user) return ws;
    if (user.role === "admin") return items;
    if (user.role === "ocp" || user.role === "ocvp") return ws;
    return ws.filter((i) => i.keyAreaId === user.keyAreaId);
  }, [items, user, workspace]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return visible;
    return visible.filter((i) =>
      i.company.toLowerCase().includes(q) ||
      i.itemType.toLowerCase().includes(q) ||
      i.contact.toLowerCase().includes(q),
    );
  }, [visible, query]);

  const totals = useMemo(() => ({
    count: filtered.length,
    confirmed: filtered.filter((i) => i.stage === "confirmed").length,
    pending: filtered.filter((i) => i.pendingValidation).length,
  }), [filtered]);

  const initiateMove = (itemId: string, targetStage: LogisticsStageId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (!canMove(item, targetStage, user)) {
      toast.error(!item.validated ? "Admin must validate first." : "Permission denied."); return;
    }
    setPendingMove({ itemId, targetStage });
  };

  const applyMove = (itemId: string, targetStage: LogisticsStageId, notes?: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const stageName = logisticsStages.find((s) => s.id === targetStage)?.name ?? targetStage;
    saveItems(items.map((i) => i.id === itemId
      ? { ...i, stage: targetStage, notes: notes ? `${i.notes}\n[${stageName}] ${notes}`.trim() : i.notes, updatedAt: "Just now" }
      : i
    ));
    toast.success(`"${item.company}" moved to ${stageName}`);
    setPendingMove(null);
    if (activeItem?.id === itemId) {
      setActiveItem(items.find(i => i.id === itemId) ?? null);
    }
  };

  const validateItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    saveItems(items.map((i) => i.id === itemId ? { ...i, validated: true, pendingValidation: false, updatedAt: "Just now" } : i));
    toast.success(`"${item.company}" validated`);
  };

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Logistics" }]}
        title="Logistics pipeline"
        subtitle={`${totals.count} requests · ${totals.confirmed} confirmed · ${totals.pending} pending`}
        action={
          <button onClick={() => setShowNew(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-3 text-xs font-medium text-primary-foreground shadow-card hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New request
          </button>
        }
      />

      <div className="px-8 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, item type, contact…"
              className="h-9 w-full rounded-lg border border-border bg-card/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none" />
          </div>
          {isAdmin && totals.pending > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
              <ShieldAlert className="h-3.5 w-3.5" />{totals.pending} pending validation
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-8 pb-8 scrollbar-thin">
        <div className="flex min-w-max gap-4">
          {logisticsStages.map((stage) => {
            const stageItems = filtered.filter((i) => i.stage === stage.id);
            const totalQty = stageItems.reduce((s, i) => s + i.quantity, 0);
            return (
              <div key={stage.id} className="flex w-[280px] shrink-0 flex-col">
                <div className={cn("mb-3 flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-3 py-2 ring-1", toneRing[stage.tone])}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", toneDot[stage.tone])} />
                    <span className="text-sm font-medium">{stage.name}</span>
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{stageItems.length}</span>
                  </div>
                  {totalQty > 0 && <span className="font-mono text-[11px] text-muted-foreground">{totalQty} units</span>}
                </div>
                <div className="space-y-2.5">
                  {stageItems.map((item) => (
                    <LogisticsCard key={item.id} item={item} onOpen={() => setActiveItem(item)}
                      onValidate={isAdmin && item.pendingValidation ? () => validateItem(item.id) : undefined}
                      onMove={(s) => initiateMove(item.id, s)} canMove={(s) => canMove(item, s, user)} />
                  ))}
                  {stageItems.length === 0 && (
                    <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeItem && (
        <LogisticsSheet item={activeItem} onClose={() => setActiveItem(null)}
          onValidate={isAdmin && activeItem.pendingValidation ? () => validateItem(activeItem.id) : undefined}
          onMove={(s) => initiateMove(activeItem.id, s)} canMove={(s) => canMove(activeItem, s, user)} />
      )}

      {showNew && (
        <NewLogisticsDialog workspace={workspace} user={user} onClose={() => setShowNew(false)}
          onAdd={(draft) => {
            const isNonAdmin = user?.role === "oc" || user?.role === "ocvp";
            const newItem: LogisticsItem = {
              ...draft,
              id: `LG-${Date.now()}`,
              workspaceId: workspace,
              keyAreaId: user?.role === "oc" ? (user.keyAreaId ?? "logistics") : draft.keyAreaId,
              assigneeId: user?.id,
              assigneeName: user?.name,
              assigneeHue: user?.hue,
              validated: !isNonAdmin,
              pendingValidation: isNonAdmin,
              stage: "new",
              updatedAt: "Just now",
            };
            saveItems([...items, newItem]);
            if (isNonAdmin) toast.info("Request submitted — awaiting validation");
            else toast.success(`"${draft.company}" request added`);
            setShowNew(false);
          }} />
      )}

      {pendingMove && (
        <MoveNoteDialog
          item={items.find(i => i.id === pendingMove.itemId)!}
          targetStage={pendingMove.targetStage}
          onConfirm={(notes) => applyMove(pendingMove.itemId, pendingMove.targetStage, notes)}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </>
  );
}

// ─── LogisticsCard ────────────────────────────────────────────────────────────
function LogisticsCard({ item, onOpen, onValidate, onMove, canMove }: {
  item: LogisticsItem; onOpen: () => void;
  onValidate?: () => void;
  onMove: (s: LogisticsStageId) => void;
  canMove: (s: LogisticsStageId) => boolean;
}) {
  const forwardStages = logisticsStages.filter((s) => LOGISTICS_STAGE_ORDER[s.id] > LOGISTICS_STAGE_ORDER[item.stage]);
  return (
    <div className={cn("relative rounded-xl border border-border/60 bg-card/80 p-3 backdrop-blur-xl hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_var(--primary)] transition")}>
      {item.pendingValidation && (
        <span className="absolute -top-1.5 left-3 inline-flex items-center gap-1 rounded-md bg-warning/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
          <ShieldAlert className="h-2.5 w-2.5" /> Pending
        </span>
      )}
      <button className="w-full text-left" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.company}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">{item.itemType}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-base font-bold">{item.quantity}</div>
            <div className="text-[10px] text-muted-foreground">{item.unit}</div>
          </div>
        </div>
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((t) => <span key={t} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted-foreground">{item.updatedAt}</div>
      </button>
      {onValidate && (
        <button onClick={(e) => { e.stopPropagation(); onValidate(); }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-success/40 bg-success/10 py-1 text-[11px] font-medium text-success hover:bg-success/20">
          <ShieldCheck className="h-3 w-3" /> Validate
        </button>
      )}
      {forwardStages.length > 0 && (
        <div className="relative mt-2">
          <select className="h-8 w-full appearance-none rounded-lg bg-primary/10 text-primary pl-2 pr-6 text-[11px] font-medium cursor-pointer border border-primary/20 hover:bg-primary/20 focus:outline-none"
            defaultValue=""
            onChange={(e) => { if (e.target.value) { onMove(e.target.value as LogisticsStageId); e.target.value = ""; } }}>
            <option value="" disabled>Move to…</option>
            {forwardStages.map((s) => <option key={s.id} value={s.id} disabled={!canMove(s.id)}>→ {s.name}</option>)}
          </select>
          <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-primary/70" />
        </div>
      )}
    </div>
  );
}

// ─── LogisticsSheet ───────────────────────────────────────────────────────────
function LogisticsSheet({ item, onClose, onValidate, onMove, canMove }: {
  item: LogisticsItem; onClose: () => void;
  onValidate?: () => void;
  onMove: (s: LogisticsStageId) => void;
  canMove: (s: LogisticsStageId) => boolean;
}) {
  const stage = logisticsStages.find((s) => s.id === item.stage)!;
  const forwardStages = logisticsStages.filter((s) => LOGISTICS_STAGE_ORDER[s.id] > LOGISTICS_STAGE_ORDER[item.stage]);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-border/60 bg-card shadow-elegant">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div className="min-w-0">
            <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1", toneRing[stage.tone])}>
              <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[stage.tone])} />{stage.name}
            </span>
            <h2 className="mt-2 truncate font-display text-2xl font-semibold">{item.company}</h2>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
          {onValidate && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-warning"><ShieldAlert className="h-4 w-4" /> Awaiting validation</div>
              <button onClick={onValidate} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Validate request
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Item type</div>
              <div className="mt-1 text-base font-semibold flex items-center gap-1.5"><Package className="h-4 w-4 text-muted-foreground" />{item.itemType}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Quantity</div>
              <div className="mt-1 font-mono text-2xl font-bold">{item.quantity} <span className="text-sm text-muted-foreground">{item.unit}</span></div>
            </div>
          </div>

          <section>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3"><Building2 className="h-3.5 w-3.5" />Supplier contact</div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-2">
              <div className="font-medium">{item.contact}</div>
              {item.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{item.email}</div>}
              {item.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{item.phone}</div>}
            </div>
          </section>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((t) => <span key={t} className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">{t}</span>)}
            </div>
          )}

          {item.notes && (
            <section>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2"><MessageCircle className="h-3.5 w-3.5" />Notes</div>
              <p className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{item.notes}</p>
            </section>
          )}

          <div className="rounded-xl border border-primary/30 bg-[var(--gradient-primary)] p-4 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" /> AI insight</div>
            <p className="mt-2 text-sm leading-snug">
              {item.stage === "negotiation" ? "Finalize quantity and delivery date. Get a written quote before confirming." :
               item.stage === "contacted" ? "Request a detailed quotation including delivery timeline and insurance." :
               item.stage === "confirmed" ? "Coordinate delivery date with the venue logistics coordinator." :
               "Reach out with a clear specification sheet to get an accurate quote."}
            </p>
          </div>
        </div>

        {forwardStages.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border/60 bg-background/40 p-4">
            {forwardStages.map((s) => (
              <button key={s.id} onClick={() => onMove(s.id)} disabled={!canMove(s.id)}
                className={cn("flex-1 h-9 min-w-[80px] rounded-lg text-sm font-medium transition border",
                  canMove(s.id) ? "bg-[var(--gradient-primary)] text-primary-foreground border-transparent hover:opacity-90" : "border-border text-muted-foreground cursor-not-allowed opacity-50")}>
                → {s.name}
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── MoveNoteDialog ───────────────────────────────────────────────────────────
function MoveNoteDialog({ item, targetStage, onConfirm, onCancel }: {
  item: LogisticsItem; targetStage: LogisticsStageId;
  onConfirm: (notes: string) => void; onCancel: () => void;
}) {
  const [notes, setNotes] = useState("");
  const stageName = logisticsStages.find((s) => s.id === targetStage)?.name ?? targetStage;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4">
        <button onClick={onCancel} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <h3 className="font-display font-semibold mb-1">→ {stageName}</h3>
        <p className="text-xs text-muted-foreground mb-4">{item.company} · {item.itemType} ({item.quantity} {item.unit})</p>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Any details about this stage transition…"
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none" />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
          <button onClick={() => onConfirm(notes)} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── NewLogisticsDialog ───────────────────────────────────────────────────────
function NewLogisticsDialog({ workspace, user, onClose, onAdd }: {
  workspace: string;
  user: ReturnType<typeof useAuth>["user"];
  onClose: () => void;
  onAdd: (draft: Omit<LogisticsItem, "id" | "updatedAt" | "workspaceId" | "assigneeId" | "assigneeName" | "assigneeHue" | "validated" | "pendingValidation" | "stage">) => void;
}) {
  const [form, setForm] = useState({
    company: "", contact: "", email: "", phone: "",
    itemType: "", quantity: "", unit: "units", notes: "",
    keyAreaId: user?.keyAreaId ?? "logistics",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <h3 className="font-display font-semibold mb-4">New logistics request</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Company / Supplier *</label>
            <input value={form.company} onChange={set("company")} placeholder="Supplier name" className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Item type *</label>
              <input value={form.itemType} onChange={set("itemType")} placeholder="e.g. Chairs, Sound System" className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Quantity *</label>
              <input type="number" min="1" value={form.quantity} onChange={set("quantity")} placeholder="100" className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Unit</label>
            <select value={form.unit} onChange={set("unit")} className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none">
              {["units", "sets", "kg", "boxes", "pallets", "pieces", "meters"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Contact person</label>
            <input value={form.contact} onChange={set("contact")} placeholder="Name" className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Email</label>
              <input type="email" value={form.email} onChange={set("email")} className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Phone</label>
              <input value={form.phone} onChange={set("phone")} className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
          <button onClick={() => {
            if (!form.company.trim() || !form.itemType.trim() || !form.quantity) { toast.error("Company, item type and quantity required."); return; }
            onAdd({ company: form.company, contact: form.contact, email: form.email, phone: form.phone, itemType: form.itemType, quantity: Number(form.quantity), unit: form.unit, notes: form.notes, tags: [], keyAreaId: form.keyAreaId });
          }} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Add request</button>
        </div>
      </div>
    </div>
  );
}
