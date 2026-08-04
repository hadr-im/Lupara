import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import { workspaceMembers, type PmTask } from "@/lib/mock/data";
import { getPmTasks, upsertPmTask } from "@/lib/db/server-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, X, ClipboardList, Clock, CheckCircle2, Circle,
  Loader2, AlertCircle, ChevronDown, Pencil, Trash2, Send,
  Users, User,
} from "lucide-react";

export const Route = createFileRoute("/$workspace/pm-tasks")({
  component: PmTasksPage,
});


const PRIORITY_META: Record<PmTask["priority"], { label: string; cls: string }> = {
  low:    { label: "Low",    cls: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", cls: "bg-info/15 text-info" },
  high:   { label: "High",   cls: "bg-warning/15 text-warning" },
  urgent: { label: "Urgent", cls: "bg-destructive/15 text-destructive" },
};

const STATUS_META: Record<PmTask["status"], { label: string; icon: React.ElementType; cls: string }> = {
  draft:      { label: "Draft",       icon: Circle,        cls: "text-muted-foreground" },
  todo:       { label: "To Do",       icon: Circle,        cls: "text-info" },
  in_progress:{ label: "In Progress", icon: Loader2,       cls: "text-warning" },
  done:       { label: "Done",        icon: CheckCircle2,  cls: "text-success" },
};

type Filter = "all" | "mine" | "draft" | "done";

const EMPTY_FORM = {
  title: "",
  description: "",
  priority: "medium" as PmTask["priority"],
  dueDate: "",
  assignedTo: "all" as string,
};

function PmTasksPage() {
  const { workspace } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const { push } = useNotifications();

  const [tasks, setTasks] = useState<PmTask[]>([]);

  useEffect(() => {
    getPmTasks({ data: { workspaceId: workspace } })
      .then((rows) => setTasks(rows as PmTask[]))
      .catch(() => {});
  }, [workspace]);
  const [filter, setFilter] = useState<Filter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PmTask | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [publishOnSave, setPublishOnSave] = useState(false);

  // Only non-OC members of this workspace (assignable targets)
  const assignableMembers = useMemo(
    () =>
      workspaceMembers.filter(
        (m) =>
          (m.workspaceId === workspace || m.role === "admin") &&
          m.role !== "oc",
      ),
    [workspace],
  );

  const canEdit = isAdmin;

  // What tasks this user can see
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (isAdmin) return true;
      // Non-admin only sees published tasks assigned to them or all
      if (t.status === "draft") return false;
      if (t.assignedTo === "all") return true;
      return t.assignedTo === user?.id;
    });
  }, [tasks, isAdmin, user]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "mine":
        return visibleTasks.filter(
          (t) => t.assignedTo === user?.id || t.assignedTo === "all",
        );
      case "draft":
        return visibleTasks.filter((t) => t.status === "draft");
      case "done":
        return visibleTasks.filter((t) => t.status === "done");
      default:
        return visibleTasks;
    }
  }, [visibleTasks, filter, user]);

  function persist(updated: PmTask[]) {
    setTasks(updated);
    for (const t of updated) {
      upsertPmTask({ data: {
        id: t.id, workspaceId: t.workspaceId ?? workspace,
        title: t.title, description: t.description,
        priority: t.priority, status: t.status,
        dueDate: t.dueDate, assignedTo: t.assignedTo,
        assignedToName: t.assignedToName, assignedToHue: t.assignedToHue,
        createdBy: t.createdBy, publishedAt: t.publishedAt,
      }}).catch(console.error);
    }
  }

  function openCreate() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setPublishOnSave(false);
    setShowModal(true);
  }

  function openEdit(task: PmTask) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      assignedTo: task.assignedTo,
    });
    setPublishOnSave(false);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    const assignedMember =
      form.assignedTo === "all"
        ? null
        : assignableMembers.find((m) => m.id === form.assignedTo);

    const now = new Date().toISOString();
    const shouldPublish = publishOnSave;

    if (editingTask) {
      const updated = tasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: form.title,
              description: form.description,
              priority: form.priority,
              dueDate: form.dueDate || undefined,
              assignedTo: form.assignedTo,
              assignedToName: form.assignedTo === "all" ? "All Members" : (assignedMember?.name ?? ""),
              assignedToHue: assignedMember?.hue,
              ...(shouldPublish && t.status === "draft"
                ? { status: "todo" as const, publishedAt: now }
                : {}),
            }
          : t,
      );
      persist(updated);
      if (shouldPublish && editingTask.status === "draft") {
        sendNotifications(form, assignedMember, editingTask.id, now);
        toast.success("Task published");
      } else {
        toast.success("Task updated");
      }
    } else {
      const newTask: PmTask = {
        id: `PT-${Date.now()}`,
        workspaceId: workspace,
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: shouldPublish ? "todo" : "draft",
        dueDate: form.dueDate || undefined,
        assignedTo: form.assignedTo,
        assignedToName: form.assignedTo === "all" ? "All Members" : (assignedMember?.name ?? ""),
        assignedToHue: assignedMember?.hue,
        createdBy: user?.id ?? "admin",
        createdAt: now,
        publishedAt: shouldPublish ? now : undefined,
      };
      persist([...tasks, newTask]);
      if (shouldPublish) {
        sendNotifications(form, assignedMember, newTask.id, now);
        toast.success("Task published & members notified");
      } else {
        toast.success("Task saved as draft");
      }
    }
    setShowModal(false);
  }

  function sendNotifications(
    f: typeof form,
    assignedMember: (typeof assignableMembers)[0] | null | undefined,
    taskId: string,
    now: string,
  ) {
    if (f.assignedTo === "all") {
      // Push a notification for each non-OC member in this workspace
      assignableMembers
        .filter((m) => m.workspaceId === workspace || m.role === "ocp")
        .forEach((m) => {
          push({
            type: "task_assigned",
            title: "New task assigned to you",
            message: `"${f.title}" — assigned to all members by admin.`,
            taskId,
            targetRole: m.role,
            targetUserId: m.id,
            workspaceId: workspace,
          });
        });
    } else if (assignedMember) {
      push({
        type: "task_assigned",
        title: "New task assigned to you",
        message: `"${f.title}" — assigned to you by admin.`,
        taskId,
        targetRole: assignedMember.role,
        targetUserId: assignedMember.id,
        workspaceId: workspace,
      });
    }
  }

  function publishTask(task: PmTask) {
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, status: "todo" as const, publishedAt: now } : t,
    );
    persist(updated);
    const assignedMember =
      task.assignedTo === "all"
        ? null
        : assignableMembers.find((m) => m.id === task.assignedTo);
    sendNotifications(
      { ...form, title: task.title, assignedTo: task.assignedTo },
      assignedMember,
      task.id,
      now,
    );
    toast.success("Task published — members notified");
  }

  function updateStatus(taskId: string, status: PmTask["status"]) {
    persist(tasks.map((t) => (t.id === taskId ? { ...t, status } : t)));
  }

  function deleteTask(taskId: string) {
    persist(tasks.filter((t) => t.id !== taskId));
    toast.success("Task deleted");
  }

  const counts = {
    all: visibleTasks.length,
    mine: visibleTasks.filter((t) => t.assignedTo === user?.id || t.assignedTo === "all").length,
    draft: visibleTasks.filter((t) => t.status === "draft").length,
    done: visibleTasks.filter((t) => t.status === "done").length,
  };

  return (
    <>
      <Topbar
        breadcrumb={[{ label: "PM & EWA" }, { label: "Tasks" }]}
        title="Tasks"
        subtitle="Admin-assigned tasks for PM department members"
        action={
          canEdit ? (
            <button
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-card transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New Task
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-auto px-8 py-6">
        {/* Filter tabs */}
        <div className="mb-5 flex items-center gap-1 border-b border-border/60 pb-0">
          {(
            [
              { key: "all", label: "All Tasks" },
              { key: "mine", label: "My Tasks" },
              ...(isAdmin ? [{ key: "draft" as Filter, label: "Drafts" }] : []),
              { key: "done", label: "Done" },
            ] as { key: Filter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition",
                filter === tab.key
                  ? "border-border/60 bg-card text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Task list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No tasks here yet.</p>
            {canEdit && (
              <button onClick={openCreate} className="mt-3 text-sm text-primary hover:underline">
                Create the first task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                canEdit={canEdit}
                isAdmin={isAdmin}
                userId={user?.id ?? ""}
                onEdit={() => openEdit(task)}
                onDelete={() => deleteTask(task.id)}
                onPublish={() => publishTask(task)}
                onStatusChange={(s) => updateStatus(task.id, s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
              <h2 className="font-display text-lg font-semibold">
                {editingTask ? "Edit Task" : "New Task"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Task title…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Assignee */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Assign to</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="all">All Members</option>
                  {assignableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Publish toggle */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                <input
                  type="checkbox"
                  checked={publishOnSave}
                  onChange={(e) => setPublishOnSave(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <div>
                  <div className="text-sm font-medium">Publish immediately</div>
                  <div className="text-xs text-muted-foreground">Members receive a notification right away</div>
                </div>
                <Send className="ml-auto h-4 w-4 text-muted-foreground" />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/60 px-6 py-4">
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
                {publishOnSave ? "Save & Publish" : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskCard({
  task,
  canEdit,
  isAdmin,
  userId,
  onEdit,
  onDelete,
  onPublish,
  onStatusChange,
}: {
  task: PmTask;
  canEdit: boolean;
  isAdmin: boolean;
  userId: string;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onStatusChange: (s: PmTask["status"]) => void;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const priority = PRIORITY_META[task.priority];
  const statusMeta = STATUS_META[task.status];
  const StatusIcon = statusMeta.icon;

  const canChangeStatus = isAdmin || task.assignedTo === userId || task.assignedTo === "all";
  const nextStatuses = (
    {
      draft: [],
      todo: ["in_progress", "done"],
      in_progress: ["todo", "done"],
      done: ["todo", "in_progress"],
    } as Record<PmTask["status"], PmTask["status"][]>
  )[task.status];

  return (
    <div
      className={cn(
        "group rounded-2xl border border-border/60 bg-card p-5 transition hover:border-border hover:shadow-card",
        task.status === "done" && "opacity-70",
        task.status === "draft" && "border-dashed",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Status icon / menu */}
        <div className="relative mt-0.5 shrink-0">
          <button
            onClick={() => canChangeStatus && nextStatuses.length > 0 && setShowStatusMenu((v) => !v)}
            className={cn("transition", canChangeStatus && nextStatuses.length > 0 ? "hover:scale-110" : "cursor-default")}
            title={statusMeta.label}
          >
            <StatusIcon className={cn("h-5 w-5", statusMeta.cls)} />
          </button>
          {showStatusMenu && (
            <div className="absolute left-0 top-7 z-10 w-40 rounded-xl border border-border bg-card shadow-elegant">
              {nextStatuses.map((s) => {
                const sm = STATUS_META[s];
                const Ic = sm.icon;
                return (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(s); setShowStatusMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-secondary"
                  >
                    <Ic className={cn("h-4 w-4", sm.cls)} />
                    {sm.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {task.status === "draft" && (
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Draft
              </span>
            )}
          </div>

          <p className={cn("text-sm font-medium leading-snug", task.status === "done" && "line-through text-muted-foreground")}>
            {task.title}
          </p>

          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {/* Assignee */}
            <div className="flex items-center gap-1.5">
              {task.assignedTo === "all" ? (
                <Users className="h-3.5 w-3.5" />
              ) : (
                <Avatar name={task.assignedToName} hue={task.assignedToHue ?? 200} size={16} />
              )}
              <span>{task.assignedToName}</span>
            </div>

            {/* Due date */}
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </div>
            )}

            {/* Published date */}
            {task.publishedAt && (
              <div className="flex items-center gap-1 text-success">
                <Send className="h-3 w-3" />
                Published {new Date(task.publishedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {canEdit && task.status === "draft" && (
            <button
              onClick={onPublish}
              title="Publish & notify"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
          {canEdit && (
            <button
              onClick={onEdit}
              title="Edit"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onDelete}
              title="Delete"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
