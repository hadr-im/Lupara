import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import {
  activityLog,
  keyAreas,
  workspaces,
  type ActivityEntry,
} from "@/lib/mock/data";
import { useAuth } from "@/lib/auth-context";
import {
  CheckCircle2,
  TrendingUp,
  Users,
  Cpu,
  FileText,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/activity")({
  component: ActivityPage,
});

const typeIcons: Record<ActivityEntry["type"], React.ComponentType<{ className?: string }>> = {
  task: CheckCircle2,
  lead: TrendingUp,
  member: Users,
  system: Cpu,
  file: FileText,
};

const typeColors: Record<ActivityEntry["type"], string> = {
  task: "bg-accent/10 text-accent ring-accent/30",
  lead: "bg-warning/10 text-warning ring-warning/30",
  member: "bg-primary/10 text-primary ring-primary/30",
  system: "bg-info/10 text-info ring-info/30",
  file: "bg-muted text-muted-foreground ring-border",
};

const toneMap: Record<string, string> = {
  accent: "bg-accent",
  warning: "bg-warning",
  success: "bg-success",
  info: "bg-info",
  primary: "bg-primary",
  destructive: "bg-destructive",
};

function ActivityPage() {
  const { workspace } = Route.useParams();
  const { user } = useAuth();

  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace.toUpperCase();

  const [filterType, setFilterType] = useState<ActivityEntry["type"] | "all">("all");
  const [filterArea, setFilterArea] = useState<string>("all");

  const wsActivity = useMemo(
    () => activityLog.filter((e) => e.workspaceId === workspace),
    [workspace],
  );

  const filtered = useMemo(() => {
    let result = wsActivity;
    if (filterType !== "all") result = result.filter((e) => e.type === filterType);
    if (filterArea !== "all") result = result.filter((e) => e.areaId === filterArea);
    return result;
  }, [wsActivity, filterType, filterArea]);

  const areaOptions = [
    { id: "all", name: "All areas" },
    ...keyAreas.filter((a) => wsActivity.some((e) => e.areaId === a.id)),
  ];

  const typeOptions: { id: ActivityEntry["type"] | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "task", label: "Tasks" },
    { id: "lead", label: "Leads" },
    { id: "member", label: "Members" },
    { id: "system", label: "System" },
  ];

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Activity" }]}
        title="Activity log"
        subtitle={`${wsActivity.length} events in ${wsName}`}
      />

      {/* Filters */}
      <div className="border-b border-border/60 px-8 py-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Type</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {typeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                filterType === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Area</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {areaOptions.map((a) => (
            <button
              key={a.id}
              onClick={() => setFilterArea(a.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                filterArea === a.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No activity matches your filters</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border/60" />

            <ol className="space-y-0">
              {filtered.map((entry, idx) => {
                const Icon = typeIcons[entry.type];
                const isLast = idx === filtered.length - 1;
                return (
                  <li key={entry.id} className={cn("relative flex gap-4 pl-12", !isLast && "pb-6")}>
                    {/* Icon node */}
                    <div
                      className={cn(
                        "absolute left-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1",
                        typeColors[entry.type],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Card */}
                    <div className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={entry.who} hue={entry.whoHue} size={28} />
                          <div className="min-w-0">
                            <div className="text-sm">
                              <span className="font-semibold">{entry.who}</span>{" "}
                              <span className="text-muted-foreground">{entry.action}</span>
                            </div>
                            <div className="mt-0.5 truncate text-xs font-medium text-foreground/80">
                              {entry.target}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {entry.areaId && (
                            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">
                              {entry.areaId}
                            </span>
                          )}
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              toneMap[entry.tone] ?? "bg-muted-foreground",
                            )}
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground">{entry.timestamp}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Load more placeholder */}
        {filtered.length > 0 && (
          <div className="mt-8 text-center">
            <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition">
              Load more activity
            </button>
          </div>
        )}
      </div>
    </>
  );
}
