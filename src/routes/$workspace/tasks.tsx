import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import {
  taskColumns,
  keyAreas,
  workspaces,
  type Task,
  type TaskColumnId,
  type TaskPriority,
} from "@/lib/mock/data";
import { getTasks, upsertTask } from "@/lib/db/server-fns";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import { toast } from "sonner";
import {
  Plus, X, Search, Flag, Calendar, MessageCircle, GripVertical,
  ChevronDown, Tag, Link as LinkIcon, CheckCircle2, XCircle, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/tasks")({
  validateSearch: (search: Record<string, unknown>) => ({
    area: typeof search.area === "string" ? search.area : "marketing",
  }),
  component: TasksPage,
});


const priorityConfig: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  critical: { label: "Critical", color: "text-destructive bg-destructive/10 ring-destructive/30", dot: "bg-destructive" },
  high: { label: "High", color: "text-warning bg-warning/10 ring-warning/30", dot: "bg-warning" },
  medium: { label: "Medium", color: "text-accent bg-accent/10 ring-accent/30", dot: "bg-accent" },
  low: { label: "Low", color: "text-muted-foreground bg-muted/60 ring-border", dot: "bg-muted-foreground" },
};

const colTone: Record<TaskColumnId, string> = {
  todo: "ring-info/40",
  in_progress: "ring-accent/40",
  review: "ring-warning/40",
  done: "ring-success/40",
};
const colDot: Record<TaskColumnId, string> = {
  todo: "bg-info",
  in_progress: "bg-accent",
  review: "bg-warning",
  done: "bg-success",
};

const COLUMN_ORDER: Record<TaskColumnId, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };

function filterTasksForUser(ts: Task[], user: ReturnType<typeof useAuth>["user"], workspace: string): Task[] {
  if (!user) return [];
  const ws = ts.filter((t) => t.workspaceId === workspace);
  if (user.role === "admin" || user.role === "ocp" || user.role === "ocvp") return ws;
  return ws.filter((t) => t.areaId === user.keyAreaId);
}

// Content/Marketing areas that require review validation
const REVIEW_AREAS = ["marketing", "content", "pr"];

// ─── Page ─────────────────────────────────────────────────────────────────────
function TasksPage() {
  const { workspace } = Route.useParams();
  const { area } = Route.useSearch();
  const { user, canSeeKeyArea, isAdmin } = useAuth();
  const { push } = useNotifications();

  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace.toUpperCase();
  const areaData = keyAreas.find((k) => k.id === area);
  const areaName = areaData?.name ?? area;

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    getTasks({ data: { workspaceId: workspace } })
      .then((rows) => { const d = rows as Task[]; setAllTasks(d); tasksRef.current = d; })
      .catch(() => {});
  }, [workspace]);

  const saveTasks = useCallback((updated: Task[]) => {
    const prev = tasksRef.current;
    tasksRef.current = updated;
    setAllTasks(updated);
    for (const task of updated) {
      const old = prev.find((x) => x.id === task.id);
      if (!old || old.status !== task.status || old.reviewLink !== task.reviewLink ||
          old.rejectionReason !== task.rejectionReason) {
        upsertTask({ data: {
          id: task.id, workspaceId: task.workspaceId ?? workspace,
          areaId: task.areaId, title: task.title,
          description: task.description, status: task.status,
          priority: task.priority, dueDate: task.dueDate,
          assigneeId: task.assigneeId, tags: task.tags,
          reviewLink: task.reviewLink, rejectionReason: task.rejectionReason,
        }}).catch(console.error);
      }
    }
  }, [workspace]);

  const [query, setQuery] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Review link dialog: when moving to "review" in marketing/content areas
  const [pendingReviewMove, setPendingReviewMove] = useState<{ taskId: string } | null>(null);
  // Reject dialog
  const [pendingReject, setPendingReject] = useState<{ taskId: string } | null>(null);

  // DnD state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskColumnId | null>(null);

  const userTasks = useMemo(
    () => filterTasksForUser(allTasks, user, workspace),
    [allTasks, user, workspace],
  );

  const areaTasks = useMemo(
    () => userTasks.filter((t) => t.areaId === area),
    [userTasks, area],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return areaTasks;
    return areaTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [areaTasks, query]);

  const moveTask = useCallback(
    (taskId: string, targetCol: TaskColumnId, options?: { reviewLink?: string; rejectionReason?: string }) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task || task.status === targetCol) return;
      if (COLUMN_ORDER[targetCol] <= COLUMN_ORDER[task.status as TaskColumnId]) {
        toast.error("Tasks can only move forward.");
        return;
      }
      // Review areas: moving to "review" requires a link
      if (targetCol === "review" && REVIEW_AREAS.includes(task.areaId) && !options?.reviewLink) {
        setPendingReviewMove({ taskId });
        return;
      }
      const updates: Partial<Task> = { status: targetCol, updatedAt: "Just now" };
      if (options?.reviewLink) updates.reviewLink = options.reviewLink;
      if (options?.rejectionReason) updates.rejectionReason = options.rejectionReason;
      // If validator approves (moves done), clear rejection reason
      if (targetCol === "done") updates.rejectionReason = undefined;

      const updated = allTasks.map((t) => t.id === taskId ? { ...t, ...updates } : t);
      saveTasks(updated);
      const colName = taskColumns.find((c) => c.id === targetCol)?.name ?? targetCol;

      if (targetCol === "review" && REVIEW_AREAS.includes(task.areaId)) {
        push({ type: "review_submitted", title: "Review pending", message: `"${task.title}" submitted for review.`, taskId: task.id, targetRole: "ocp", targetUserId: null, workspaceId: task.workspaceId });
        toast.success(`Submitted for review`);
      } else {
        toast.success(`Moved to "${colName}"`);
      }
    },
    [allTasks, saveTasks, push],
  );

  const canValidate = isAdmin || user?.role === "ocp" || user?.role === "ocvp";

  const approveTask = useCallback((taskId: string) => {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;
    const updated = allTasks.map((t) => t.id === taskId ? { ...t, status: "done" as TaskColumnId, rejectionReason: undefined, updatedAt: "Just now" } : t);
    saveTasks(updated);
    push({ type: "review_approved", title: "Task approved", message: `"${task.title}" approved and moved to Done.`, taskId: task.id, targetRole: "oc", targetUserId: task.assigneeId ?? null, workspaceId: task.workspaceId });
    toast.success("Task approved — moved to Done");
    if (activeTask?.id === taskId) setActiveTask(updated.find(t => t.id === taskId) ?? null);
  }, [allTasks, saveTasks, push, activeTask]);

  const rejectTask = useCallback((taskId: string, reason: string) => {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;
    const updated = allTasks.map((t) => t.id === taskId ? { ...t, rejectionReason: reason, updatedAt: "Just now" } : t);
    saveTasks(updated);
    push({ type: "review_rejected", title: "Task needs revision", message: `"${task.title}" was not validated: ${reason}`, taskId: task.id, targetRole: "oc", targetUserId: task.assigneeId ?? null, workspaceId: task.workspaceId });
    toast.info("Task sent back with feedback");
    setPendingReject(null);
    if (activeTask?.id === taskId) setActiveTask(updated.find(t => t.id === taskId) ?? null);
  }, [allTasks, saveTasks, push, activeTask]);

  const addTask = useCallback(
    (draft: Omit<Task, "id" | "workspaceId" | "areaId" | "createdAt" | "updatedAt" | "comments">) => {
      const newTask: Task = {
        ...draft,
        id: `T-${Date.now().toString().slice(-4)}`,
        workspaceId: workspace,
        areaId: area,
        assignee: user ? { name: user.name, hue: user.hue } : undefined,
        assigneeId: user?.id,
        comments: 0,
        createdAt: "Just now",
        updatedAt: "Just now",
      };
      saveTasks([...allTasks, newTask]);
      toast.success("Task created");
      setShowNewTask(false);
    },
    [allTasks, workspace, area, user, saveTasks],
  );

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(task.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, colId: TaskColumnId) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      setDraggingId(null);
      setDragOverCol(null);
      if (id) moveTask(id, colId);
    },
    [moveTask],
  );

  // Area tabs (visible areas only, further restricted by workspace allowedAreas)
  const visibleAreas = keyAreas.filter(
    (a) => canSeeKeyArea(workspace, a.id) && (!wsData?.allowedAreas || wsData.allowedAreas.includes(a.id)),
  );

  const stats = useMemo(() => {
    const done = filtered.filter((t) => t.status === "done").length;
    const total = filtered.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [filtered]);

  return (
    <>
      <Topbar
        breadcrumb={[
          { label: wsName },
          { label: areaName },
          { label: "Tasks" },
        ]}
        title={`${areaName} — Tasks`}
        subtitle={`${stats.done}/${stats.total} done · ${stats.pct}% complete`}
        action={
          <button
            onClick={() => setShowNewTask(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-3 text-xs font-medium text-primary-foreground shadow-card hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New task
          </button>
        }
      />

      {/* Area tabs */}
      <div className="border-b border-border/60 px-8 pt-4 pb-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-0">
          {visibleAreas.map((a) => {
            const aCount = userTasks.filter((t) => t.areaId === a.id).length;
            const isActive = a.id === area;
            return (
              <Link
                key={a.id}
                to="/$workspace/tasks"
                params={{ workspace }}
                search={{ area: a.id }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-xs font-medium transition",
                  isActive
                    ? "border-border/60 bg-card text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {a.name}
                <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {aCount}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="px-8 py-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="h-9 w-full rounded-lg border border-border bg-card/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto px-8 pb-8 scrollbar-thin">
        <div className="flex min-w-max gap-4">
          {taskColumns.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.id);
            const isOver = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                className="flex w-[300px] shrink-0 flex-col"
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id as TaskColumnId); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                onDrop={(e) => handleDrop(e, col.id as TaskColumnId)}
              >
                {/* Column header */}
                <div
                  className={cn(
                    "mb-3 flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-3 py-2 ring-1 transition-colors",
                    isOver ? "border-primary/40 bg-primary/5 ring-primary/20" : colTone[col.id as TaskColumnId],
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", colDot[col.id as TaskColumnId])} />
                    <span className="text-sm font-medium">{col.name}</span>
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowNewTask(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Drop hint */}
                {isOver && (
                  <div className="mb-2 flex h-10 items-center justify-center rounded-xl border border-dashed border-primary/40 text-xs font-medium text-primary">
                    Drop here
                  </div>
                )}

                {/* Cards */}
                <div className="space-y-2.5">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isDragging={draggingId === task.id}
                      onOpen={() => setActiveTask(task)}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                  {colTasks.length === 0 && !isOver && (
                    <button
                      onClick={() => setShowNewTask(true)}
                      className="flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task detail drawer */}
      {activeTask && (
        <TaskDrawer
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onMove={(colId) => moveTask(activeTask.id, colId)}
          canValidate={canValidate && activeTask.status === "review" && REVIEW_AREAS.includes(activeTask.areaId)}
          onApprove={() => approveTask(activeTask.id)}
          onReject={() => setPendingReject({ taskId: activeTask.id })}
        />
      )}

      {/* New task panel */}
      {showNewTask && (
        <NewTaskPanel
          onClose={() => setShowNewTask(false)}
          onAdd={addTask}
          area={area}
        />
      )}

      {/* Review link dialog */}
      {pendingReviewMove && (
        <ReviewLinkDialog
          task={allTasks.find(t => t.id === pendingReviewMove.taskId)!}
          onConfirm={(link) => {
            moveTask(pendingReviewMove.taskId, "review", { reviewLink: link });
            setPendingReviewMove(null);
          }}
          onCancel={() => setPendingReviewMove(null)}
        />
      )}

      {/* Reject dialog */}
      {pendingReject && (
        <RejectDialog
          task={allTasks.find(t => t.id === pendingReject.taskId)!}
          onConfirm={(reason) => rejectTask(pendingReject.taskId, reason)}
          onCancel={() => setPendingReject(null)}
        />
      )}

      {/* Validate review from kanban */}
      {canValidate && filtered.filter(t => t.status === "review" && REVIEW_AREAS.includes(t.areaId)).length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning backdrop-blur-sm">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {filtered.filter(t => t.status === "review" && REVIEW_AREAS.includes(t.areaId)).length} task(s) awaiting your validation
          </div>
        </div>
      )}
    </>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  isDragging: boolean;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const pc = priorityConfig[task.priority];
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative w-full cursor-grab rounded-xl border border-border/60 bg-card/80 p-3.5 text-left backdrop-blur-xl transition",
        "hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_var(--primary)]",
        "active:cursor-grabbing",
        isDragging && "opacity-40 ring-2 ring-primary/30",
      )}
    >
      <button className="w-full text-left" onClick={onOpen}>
        {/* Priority + tags */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1",
              pc.color,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", pc.dot)} />
            {pc.label}
          </span>
          {task.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Title */}
        <div className="text-sm font-semibold leading-snug">{task.title}</div>
        {task.description && (
          <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
            {task.description}
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.assignee && (
              <Avatar name={task.assignee.name} hue={task.assignee.hue} size={22} />
            )}
            {task.comments > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MessageCircle className="h-3 w-3" /> {task.comments}
              </span>
            )}
          </div>
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Calendar className="h-3 w-3" /> {task.dueDate}
            </span>
          )}
        </div>
      </button>
      <GripVertical className="absolute right-2 top-3 h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition" />
    </div>
  );
}

// ─── TaskCard — updated to show review status ─────────────────────────────────

// ─── ReviewLinkDialog ─────────────────────────────────────────────────────────
function ReviewLinkDialog({ task, onConfirm, onCancel }: { task: Task; onConfirm: (link: string) => void; onCancel: () => void }) {
  const [link, setLink] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4">
        <button onClick={onCancel} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <h3 className="font-display font-semibold mb-1">Submit for review</h3>
        <p className="text-xs text-muted-foreground mb-4">Add a link to your work before submitting for validation.</p>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Work link *</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={link} onChange={(e) => setLink(e.target.value)}
              placeholder="https://drive.google.com/…" type="url"
              className="h-9 w-full rounded-lg border border-border bg-background/60 pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
          <button onClick={() => { if (!link.trim()) { toast.error("Please add a link to your work."); return; } onConfirm(link.trim()); }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Submit</button>
        </div>
      </div>
    </div>
  );
}

// ─── RejectDialog ─────────────────────────────────────────────────────────────
function RejectDialog({ task, onConfirm, onCancel }: { task: Task; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4">
        <button onClick={onCancel} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <h3 className="font-display font-semibold mb-1">Request revision</h3>
        <p className="text-xs text-muted-foreground mb-4">{task.title}</p>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Why is it not validated? *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Explain what needs to be improved…"
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none" />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
          <button onClick={() => { if (!reason.trim()) { toast.error("Please provide a reason."); return; } onConfirm(reason.trim()); }}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition">Send back</button>
        </div>
      </div>
    </div>
  );
}

// ─── TaskDrawer ───────────────────────────────────────────────────────────────
function TaskDrawer({
  task, onClose, onMove, canValidate, onApprove, onReject,
}: {
  task: Task; onClose: () => void; onMove: (col: TaskColumnId) => void;
  canValidate?: boolean; onApprove?: () => void; onReject?: () => void;
}) {
  const pc = priorityConfig[task.priority];
  const currentCol = taskColumns.find((c) => c.id === task.status)!;
  const otherCols = taskColumns.filter((c) => COLUMN_ORDER[c.id as TaskColumnId] > COLUMN_ORDER[task.status as TaskColumnId]);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-border/60 bg-card shadow-elegant">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {task.id}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1",
                  pc.color,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", pc.dot)} />
                {pc.label}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1",
                  colTone[task.status as TaskColumnId],
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", colDot[task.status as TaskColumnId])} />
                {currentCol.name}
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {task.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground capitalize">{task.areaId} area</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
          {/* Validation panel for reviewers */}
          {canValidate && (
            <section className="rounded-xl border border-warning/40 bg-warning/5 p-4">
              <div className="text-sm font-semibold text-warning mb-2">Pending your validation</div>
              {task.reviewLink && (
                <a href={task.reviewLink} target="_blank" rel="noopener noreferrer"
                  className="mb-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> View submitted work
                </a>
              )}
              <div className="flex gap-2">
                <button onClick={onApprove}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-success/40 bg-success/10 py-1.5 text-xs font-medium text-success hover:bg-success/20">
                  <CheckCircle2 className="h-3 w-3" /> Approve → Done
                </button>
                <button onClick={onReject}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                  <XCircle className="h-3 w-3" /> Request revision
                </button>
              </div>
            </section>
          )}

          {/* Rejection reason (visible to assignee) */}
          {task.rejectionReason && (
            <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-destructive mb-1">Revision requested</div>
              <p className="text-sm text-muted-foreground">{task.rejectionReason}</p>
            </section>
          )}

          {/* Review link (visible when in review) */}
          {task.status === "review" && task.reviewLink && (
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Submitted work</div>
              <a href={task.reviewLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-3 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" /> {task.reviewLink}
              </a>
            </section>
          )}

          {/* Description */}
          <section>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Description
            </div>
            <p className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed text-muted-foreground">
              {task.description || "No description."}
            </p>
          </section>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Due date", value: task.dueDate ?? "—" },
              { label: "Comments", value: String(task.comments) },
              { label: "Created", value: task.createdAt },
              { label: "Updated", value: task.updatedAt },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</div>
                <div className="mt-1 font-mono text-sm font-semibold">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Assignee */}
          {task.assignee && (
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Assignee
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
                <Avatar name={task.assignee.name} hue={task.assignee.hue} size={36} />
                <div>
                  <div className="font-medium text-sm">{task.assignee.name}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{task.areaId}</div>
                </div>
              </div>
            </section>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    <Tag className="h-2.5 w-2.5" /> {t}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 border-t border-border/60 bg-background/40 p-4">
          <div className="relative flex-1">
            <select
              className="h-9 w-full appearance-none rounded-lg bg-[var(--gradient-primary)] pl-3 pr-7 text-sm font-medium text-primary-foreground cursor-pointer hover:opacity-90"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onMove(e.target.value as TaskColumnId);
                  e.target.value = "";
                }
              }}
            >
              <option value="" disabled>Move to column ▸</option>
              {otherCols.map((c) => (
                <option key={c.id} value={c.id}>→ {c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary-foreground/70" />
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── NewTaskPanel ─────────────────────────────────────────────────────────────
function NewTaskPanel({
  onClose,
  onAdd,
  area,
}: {
  onClose: () => void;
  onAdd: (draft: any) => void;
  area: string;
}) {
  const isContent = area === "content";
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskColumnId,
    dueDate: "",
    contentType: "Reel",
    channel: "Instagram",
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || undefined,
      tags: isContent ? [form.contentType, form.channel] : [],
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-border/60 bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <h2 className="font-display text-xl font-semibold">New task</h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 p-5">
            <Field label="Title *">
              <input
                required
                value={form.title}
                onChange={set("title")}
                placeholder="Task title"
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={set("description")}
                placeholder="What needs to be done?"
                rows={3}
                className={cn(inputCls, "resize-none")}
              />
            </Field>
            {isContent && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Content type">
                  <select value={form.contentType} onChange={set("contentType")} className={inputCls}>
                    {["Reel", "Story", "Post", "Carousel", "Video", "Article"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Channel">
                  <select value={form.channel} onChange={set("channel")} className={inputCls}>
                    {["Instagram", "LinkedIn", "Facebook", "TikTok", "YouTube"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <select value={form.priority} onChange={set("priority")} className={inputCls}>
                  {(["critical", "high", "medium", "low"] as TaskPriority[]).map((p) => (
                    <option key={p} value={p} className="capitalize">
                      {priorityConfig[p].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Column">
                <select value={form.status} onChange={set("status")} className={inputCls}>
                  {taskColumns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Due date">
              <input
                type="date"
                value={form.dueDate}
                onChange={set("dueDate")}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex gap-2 border-t border-border/60 p-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--gradient-primary)] text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Create task
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
