import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ddaySlots as seedSlots, workspaceMembers, type DDaySlot } from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/app/avatar";
import { toast } from "sonner";
import { Plus, X, MapPin, Clock, Users, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/dxp/dday")({
  component: DDayPage,
});

const STORAGE = "nucleus_dday_slots";

function load(ws: string): DDaySlot[] {
  try {
    const s = localStorage.getItem(STORAGE);
    const all: DDaySlot[] = s ? JSON.parse(s) : seedSlots;
    return all.filter((d) => d.workspaceId === ws);
  } catch { return seedSlots.filter((d) => d.workspaceId === ws); }
}
function persist(ws: string, updated: DDaySlot[]) {
  try {
    const s = localStorage.getItem(STORAGE);
    const all: DDaySlot[] = s ? JSON.parse(s) : seedSlots;
    const others = all.filter((d) => d.workspaceId !== ws);
    localStorage.setItem(STORAGE, JSON.stringify([...others, ...updated]));
  } catch {}
}

const EMPTY_FORM = { time: "", endTime: "", task: "", location: "", notes: "", assigneeIds: [] as string[] };

function DDayPage() {
  const { workspace } = Route.useParams();
  const { isAdmin, user } = useAuth();
  const canEdit = isAdmin || user?.role === "ocp" || user?.role === "ocvp" || (user?.role === "oc" && user?.keyAreaId === "dxp");

  const [slots, setSlots] = useState<DDaySlot[]>(() => load(workspace));
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const wsMembers = workspaceMembers.filter((m) => m.workspaceId === workspace || m.role === "ocp");

  const sorted = useMemo(
    () => [...slots].sort((a, b) => a.time.localeCompare(b.time)),
    [slots],
  );

  // Stats
  const allAssignees = useMemo(() => {
    const ids = new Set<string>();
    slots.forEach((s) => s.assigneeIds.forEach((id) => ids.add(id)));
    return ids.size;
  }, [slots]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(slot: DDaySlot) {
    setEditingId(slot.id);
    setForm({ time: slot.time, endTime: slot.endTime, task: slot.task, location: slot.location, notes: slot.notes ?? "", assigneeIds: [...slot.assigneeIds] });
    setShowModal(true);
  }

  function toggleAssignee(id: string) {
    setForm((f) =>
      f.assigneeIds.includes(id)
        ? { ...f, assigneeIds: f.assigneeIds.filter((x) => x !== id) }
        : { ...f, assigneeIds: [...f.assigneeIds, id] },
    );
  }

  function handleSave() {
    if (!form.time || !form.endTime || !form.task) {
      toast.error("Time range and task are required.");
      return;
    }
    if (form.assigneeIds.length === 0) {
      toast.error("Assign at least one member.");
      return;
    }
    const assignees = wsMembers.filter((m) => form.assigneeIds.includes(m.id));
    const slot: DDaySlot = {
      id: editingId ?? `DS-${Date.now()}`,
      workspaceId: workspace,
      time: form.time,
      endTime: form.endTime,
      task: form.task,
      location: form.location,
      notes: form.notes || undefined,
      assigneeIds: form.assigneeIds,
      assigneeNames: assignees.map((m) => m.name),
      assigneeHues: assignees.map((m) => m.hue),
    };
    const updated = editingId
      ? slots.map((s) => (s.id === editingId ? slot : s))
      : [...slots, slot];
    setSlots(updated);
    persist(workspace, updated);
    toast.success(editingId ? "Slot updated." : "Slot added.");
    setShowModal(false);
  }

  function deleteSlot(id: string) {
    const updated = slots.filter((s) => s.id !== id);
    setSlots(updated);
    persist(workspace, updated);
    toast.success("Slot removed.");
  }

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-lg font-semibold">D-Day Dispatch</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Event day agenda — {sorted.length} slots · {allAssignees} members dispatched
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" /> Add Slot
          </button>
        )}
      </div>

      {/* Agenda timeline */}
      {sorted.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          No dispatch slots yet.
          {canEdit && (
            <button onClick={openCreate} className="ml-2 text-primary hover:underline">
              Add the first one.
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical time spine */}
          <div className="absolute left-[5.25rem] top-3 bottom-3 w-px bg-border/50" />

          <div className="space-y-3">
            {sorted.map((slot, idx) => {
              const isFirst = idx === 0 || sorted[idx - 1].time !== slot.time;
              return (
                <div key={slot.id} className="group flex gap-0 items-start">
                  {/* Time column */}
                  <div className="w-[5.5rem] shrink-0 pt-3.5 text-right pr-4">
                    {isFirst || true ? (
                      <div className="font-mono text-xs leading-none text-muted-foreground">
                        <div className="font-semibold text-foreground">{slot.time}</div>
                        <div className="text-[10px] mt-0.5">{slot.endTime}</div>
                      </div>
                    ) : null}
                  </div>

                  {/* Dot on spine */}
                  <div className="relative z-10 mt-3.5 mr-4 h-3 w-3 shrink-0 rounded-full bg-primary/40 ring-2 ring-background" />

                  {/* Slot card */}
                  <div className="flex-1 rounded-2xl border border-border/60 bg-card p-4 transition hover:border-border hover:shadow-card mb-1">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{slot.task}</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {slot.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {slot.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {slot.time} – {slot.endTime}
                          </span>
                        </div>

                        {slot.notes && (
                          <p className="mt-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                            {slot.notes}
                          </p>
                        )}

                        {/* Assignees */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {slot.assigneeIds.map((id, i) => (
                            <div key={id} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2 py-0.5">
                              <Avatar name={slot.assigneeNames[i] ?? id} hue={slot.assigneeHues[i] ?? 200} size={16} />
                              <span className="text-[11px] font-medium">{slot.assigneeNames[i] ?? id}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {canEdit && (
                          <button
                            onClick={() => openEdit(slot)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => deleteSlot(slot.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-elegant max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 sticky top-0 bg-card z-10">
              <h3 className="font-display text-lg font-semibold">
                {editingId ? "Edit Slot" : "Add Agenda Slot"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* Time range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Start time *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">End time *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Task */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Activity / Task *</label>
                <input
                  value={form.task}
                  onChange={(e) => setForm({ ...form, task: e.target.value })}
                  placeholder="e.g. Check-in desk management"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Main Entrance"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special instructions…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Assignees */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">
                  Assigned members *{" "}
                  <span className="text-muted-foreground/60">({form.assigneeIds.length} selected)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {wsMembers.map((m) => {
                    const selected = form.assigneeIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAssignee(m.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                          selected
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border/60 bg-background hover:border-border",
                        )}
                      >
                        <Avatar name={m.name} hue={m.hue} size={24} />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{m.name}</span>
                        {selected && (
                          <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/60 px-6 py-4 sticky bottom-0 bg-card">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm transition hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                {editingId ? "Update" : "Add Slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
