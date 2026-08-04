import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { getLeads, upsertLead, getMeetings, upsertMeeting, upsertTask, deleteMeeting } from "@/lib/db/server-fns";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import {
  stages,
  workspaces,
  workspaceMembers,
  type Lead,
  type StageId,
  type Meeting,
  type WorkspaceMember,
  STAGE_ORDER,
  keyAreas,
  COMPANY_TYPES,
  TUNISIAN_CITIES,
} from "@/lib/mock/data";
import type { LeadStageData, ContactedData, MeetingData, ProposalData, ConfirmedData, LostData } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";
import { toast } from "sonner";
import {
  Search, Plus, Mail, Phone, Link as LinkedinIcon, Building2, Target,
  TrendingUp, Tag, X, ShieldCheck, ShieldAlert, Calendar, MessageCircle,
  Sparkles, ChevronRight, ChevronLeft, MapPin, Clock, User, Banknote,
  PhoneCall, Globe, CheckCircle2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/$workspace/sales")({
  component: WorkspaceSalesPage,
});

const toneRing: Record<string, string> = {
  info: "ring-info/40", accent: "ring-accent/40", warning: "ring-warning/40",
  success: "ring-success/40", destructive: "ring-destructive/40",
};
const toneDot: Record<string, string> = {
  info: "bg-info", accent: "bg-accent", warning: "bg-warning",
  success: "bg-success", destructive: "bg-destructive",
};

function fmtTND(v: number) {
  return `${v.toLocaleString("fr-TN")} TND`;
}

function canDrop(lead: Lead, targetStage: StageId, user: ReturnType<typeof useAuth>["user"]): boolean {
  if (!user) return false;
  if (STAGE_ORDER[targetStage] <= STAGE_ORDER[lead.stage]) return false;
  if (user.role === "admin") return true;
  if (user.role === "ocp" && user.workspaceId === lead.workspaceId) return true;
  if (!lead.validated) return false;
  if (user.workspaceId !== lead.workspaceId) return false;
  if (user.role === "oc" && lead.assigneeId !== user.id) return false;
  return true;
}

function canValidate(user: ReturnType<typeof useAuth>["user"]) {
  return user?.role === "admin";
}

function filterLeadsForUser(leads: Lead[], user: ReturnType<typeof useAuth>["user"], workspace: string): Lead[] {
  if (!user) return [];
  const ws = leads.filter((l) => l.workspaceId === workspace);
  if (user.role === "admin") return ws;
  if (!canSeeWorkspace(user, workspace)) return [];
  if (user.role === "ocp" || user.role === "ocvp") return ws;
  return ws.filter((l) => l.keyAreaId === user.keyAreaId && l.assigneeId === user.id);
}

function canSeeWorkspace(user: ReturnType<typeof useAuth>["user"], ws: string) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.workspaceId === ws;
}

/** Stages that require extra data when moving INTO them */
function stageRequiresData(targetStage: StageId, currentStage: StageId): boolean {
  if (targetStage === "contacted") return true;
  if (targetStage === "meeting") return true;
  if (targetStage === "proposal") return true;
  if (targetStage === "confirmed") return true;
  if (targetStage === "lost") return true;
  return false;
}

function WorkspaceSalesPage() {
  const { workspace } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const { push } = useNotifications();

  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace.toUpperCase();

  const [leads, setLeads] = useState<Lead[]>([]);
  const leadsRef = useRef<Lead[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const meetingsRef = useRef<Meeting[]>([]);

  useEffect(() => {
    getLeads({ data: { workspaceId: workspace } })
      .then((rows) => { const d = rows as Lead[]; setLeads(d); leadsRef.current = d; })
      .catch(() => {});
    getMeetings({ data: { workspaceId: workspace } })
      .then((rows) => { const d = rows as Meeting[]; setMeetings(d); meetingsRef.current = d; })
      .catch(() => {});
  }, [workspace]);

  const saveLeads = useCallback((updated: Lead[]) => {
    const prev = leadsRef.current;
    leadsRef.current = updated;
    setLeads(updated);
    for (const lead of updated) {
      const old = prev.find((l) => l.id === lead.id);
      if (!old || old.stage !== lead.stage || old.validated !== lead.validated ||
          old.pendingValidation !== lead.pendingValidation ||
          JSON.stringify(old.stageData) !== JSON.stringify(lead.stageData)) {
        upsertLead({ data: {
          id: lead.id, workspaceId: lead.workspaceId ?? workspace,
          company: lead.company, companyType: lead.companyType,
          address: lead.address, contact: lead.contact,
          email: lead.email, phone: lead.phone,
          industry: lead.industry, interest: lead.interest,
          value: lead.value, probability: lead.probability,
          stage: lead.stage, stageData: lead.stageData as Record<string, unknown>,
          assigneeId: lead.assigneeId, tags: lead.tags,
          notes: lead.notes, pendingValidation: lead.pendingValidation,
          validated: lead.validated,
        }}).catch(console.error);
      }
    }
  }, [workspace]);

  const saveTask = useCallback((newTask: any) => {
    upsertTask({ data: {
      id: newTask.id, workspaceId: newTask.workspaceId ?? workspace,
      areaId: newTask.areaId ?? "marketing", title: newTask.title,
      description: newTask.description, status: newTask.status ?? "todo",
      priority: newTask.priority ?? "high", tags: newTask.tags ?? [],
    }}).catch(console.error);
  }, [workspace]);

  const saveMeetings = useCallback((updated: Meeting[]) => {
    const prev = meetingsRef.current;
    meetingsRef.current = updated;
    setMeetings(updated);

    // 1. Delete removed meetings
    const deleted = prev.filter((p) => !updated.some((u) => u.id === p.id));
    for (const m of deleted) {
      deleteMeeting({ data: { id: m.id } }).catch(console.error);
    }

    // 2. Upsert new or updated meetings
    for (const m of updated) {
      const old = prev.find((x) => x.id === m.id);
      if (
        !old ||
        old.partnerName !== m.partnerName ||
        old.date !== m.date ||
        old.time !== m.time ||
        old.location !== m.location ||
        old.status !== m.status ||
        old.assignedOcId !== m.assignedOcId ||
        old.notes !== m.notes ||
        old.leadId !== m.leadId
      ) {
        upsertMeeting({ data: {
          id: m.id, workspaceId: m.workspaceId ?? workspace,
          leadId: m.leadId, company: m.partnerName,
          scheduledDate: m.date, scheduledTime: m.time,
          location: m.location, status: m.status,
          assignedOcId: m.assignedOcId, assignedOcName: m.assignedOcName,
          assignedOcHue: m.assignedOcHue, notes: m.notes,
        }}).catch(console.error);
      }
    }
  }, [workspace]);

  const [view, setView] = useState<"pipeline" | "calendar">("pipeline");
  const [query, setQuery] = useState("");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<StageId | null>(null);

  const [pendingMove, setPendingMove] = useState<{ leadId: string; targetStage: StageId } | null>(null);

  useEffect(() => {
    if (activeLead) {
      const updated = leads.find((l) => l.id === activeLead.id);
      if (updated) setActiveLead(updated);
    }
  }, [leads]);

  const visible = useMemo(() => filterLeadsForUser(leads, user, workspace), [leads, user, workspace]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return visible;
    return visible.filter((l) =>
      l.company.toLowerCase().includes(q) ||
      l.contact.toLowerCase().includes(q) ||
      l.industry.toLowerCase().includes(q) ||
      l.companyType?.toLowerCase().includes(q) ||
      l.address?.toLowerCase().includes(q),
    );
  }, [visible, query]);

  const totals = useMemo(() => {
    const sum = filtered.reduce((s, l) => s + l.value, 0);
    const won = filtered.filter((l) => l.stage === "confirmed").reduce((s, l) => s + l.value, 0);
    return { sum, won, count: filtered.length };
  }, [filtered]);

  const initiateMove = useCallback((leadId: string, targetStage: StageId) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (STAGE_ORDER[targetStage] <= STAGE_ORDER[lead.stage]) {
      toast.error("Pipeline is forward-only.");
      return;
    }
    if (!canDrop(lead, targetStage, user)) {
      toast.error(!lead.validated ? "Admin must validate this lead first." : "Permission denied.");
      return;
    }
    if (stageRequiresData(targetStage, lead.stage)) {
      setPendingMove({ leadId, targetStage });
    } else {
      applyMove(leadId, targetStage, undefined);
    }
  }, [leads, user]);

  const applyMove = useCallback((leadId: string, targetStage: StageId, stageData: LeadStageData | undefined) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const stageName = stages.find((s) => s.id === targetStage)?.name ?? targetStage;
    const mergedStageData: LeadStageData = { ...lead.stageData, ...stageData };
    const updated = leads.map((l) => l.id === leadId
      ? { ...l, stage: targetStage, stageData: mergedStageData, updatedAt: "Just now" }
      : l
    );
    saveLeads(updated);

    // If confirmed → create marketing to-do task for partner services
    if (targetStage === "confirmed" && stageData?.confirmed) {
      const { services, amount } = stageData.confirmed;
      const servicesList = services ? services.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
      
      if (servicesList.length > 0) {
        servicesList.forEach((service, index) => {
          const newTask = {
            id: `T-${Date.now()}-${index}`,
            workspaceId: lead.workspaceId,
            areaId: "marketing",
            title: `🤝 ${lead.company} — ${service}`,
            description: `Confirmed partner "${lead.company}" (${lead.companyType ?? ""}). Service: ${service}. Budget: ${fmtTND(amount)}. Contact: ${lead.contact} <${lead.email}>.`,
            status: "todo",
            priority: "high",
            tags: ["Partner", "Confirmed", service],
            comments: 0,
            createdAt: "Just now",
            updatedAt: "Just now",
          };
          saveTask(newTask);
        });
        push({ type: "partner_confirmed", title: "New confirmed partner", message: `${lead.company} confirmed — ${servicesList.length} services added to Marketing To Do.`, leadId: lead.id, targetRole: "oc", targetUserId: null, workspaceId: lead.workspaceId });
        toast.success(`"${lead.company}" confirmed — ${servicesList.length} tasks created in Marketing`);
      } else {
        const newTask = {
          id: `T-${Date.now()}`,
          workspaceId: lead.workspaceId,
          areaId: "marketing",
          title: `🤝 ${lead.company} — Partner Confirmed`,
          description: `Confirmed partner "${lead.company}" (${lead.companyType ?? ""}). Budget: ${fmtTND(amount)}. Contact: ${lead.contact} <${lead.email}>.`,
          status: "todo",
          priority: "high",
          tags: ["Partner", "Confirmed"],
          comments: 0,
          createdAt: "Just now",
          updatedAt: "Just now",
        };
        saveTask(newTask);
        push({ type: "partner_confirmed", title: "New confirmed partner", message: `${lead.company} confirmed — added to Marketing To Do.`, leadId: lead.id, targetRole: "oc", targetUserId: null, workspaceId: lead.workspaceId });
        toast.success(`"${lead.company}" confirmed — task created in Marketing`);
      }
    } else {
      toast.success(`"${lead.company}" moved to ${stageName}`);
    }

    // If meeting stage → auto-create meeting entry
    if (targetStage === "meeting" && stageData?.meeting) {
      const md = stageData.meeting;
      const oc = workspaceMembers.find((m) => m.id === user?.id);
      const newMeeting: Meeting = {
        id: `M-${Date.now()}`,
        workspaceId: lead.workspaceId,
        leadId: lead.id,
        partnerName: lead.company,
        date: md.date,
        time: md.time,
        location: md.format === "google_meet" ? "Google Meet (link in email)" : (md.location ?? "Physical — TBD"),
        assignedOcId: user?.id ?? "",
        assignedOcName: user?.name ?? "",
        assignedOcHue: user?.hue ?? 220,
        notes: `Format: ${md.format === "google_meet" ? "Google Meet" : "Physical"}`,
        status: "scheduled",
      };
      saveMeetings([...meetings, newMeeting]);
    }

    setPendingMove(null);
  }, [leads, user, saveLeads, saveTask, saveMeetings, meetings, push]);

  const validateLead = useCallback((leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    saveLeads(leads.map((l) => l.id === leadId ? { ...l, validated: true, pendingValidation: false, updatedAt: "Just now" } : l));
    if (lead.assigneeId) {
      push({ type: "lead_validated", title: "Lead validated", message: `"${lead.company}" has been validated — you can now move it.`, leadId: lead.id, targetRole: "oc", targetUserId: lead.assigneeId, workspaceId: lead.workspaceId });
    }
    toast.success(`"${lead.company}" validated`);
  }, [leads, saveLeads, push]);

  const handleDragStart = useCallback((e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(lead.id);
  }, []);
  const handleDragEnd = useCallback(() => { setDraggingId(null); setDragOverStage(null); }, []);
  const handleDrop = useCallback((e: React.DragEvent, stageId: StageId) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverStage(null);
    if (leadId) initiateMove(leadId, stageId);
  }, [initiateMove]);

  const draggingLead = draggingId ? leads.find((l) => l.id === draggingId) : null;

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Sales" }, { label: view === "pipeline" ? "Pipeline" : "Meeting Calendar" }]}
        title={view === "pipeline" ? "Sales pipeline" : "Meeting Calendar"}
        subtitle={view === "pipeline"
          ? `${totals.count} deals · ${fmtTND(totals.sum)} pipeline · ${fmtTND(totals.won)} confirmed`
          : `${meetings.filter(m => m.status === "scheduled").length} upcoming meetings`}
        action={
          view === "pipeline" ? (
            <button onClick={() => setShowNewLead(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-3 text-xs font-medium text-primary-foreground shadow-card hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> New lead
            </button>
          ) : null
        }
      />

      {/* View tabs */}
      <div className="border-b border-border/60 px-8">
        <div className="flex gap-1">
          {[{ id: "pipeline", label: "Pipeline", icon: TrendingUp }, { id: "calendar", label: "Meeting Calendar", icon: Calendar }].map((tab) => (
            <button key={tab.id} onClick={() => setView(tab.id as any)}
              className={cn("inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition",
                view === tab.id ? "border-border/60 bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === "calendar" && (
        <MeetingCalendar meetings={meetings} workspace={workspace} leads={leads}
          wsMembers={workspaceMembers.filter(m => m.workspaceId === workspace)}
          canEdit={isAdmin || user?.role === "ocp" || user?.role === "ocvp"}
          isAdmin={isAdmin} onSave={saveMeetings} />
      )}

      {view === "pipeline" && <>
        <div className="px-8 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company, contact, city, type…"
                className="h-9 w-full rounded-lg border border-border bg-card/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none" />
            </div>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
                <ShieldAlert className="h-3.5 w-3.5" />
                {filtered.filter((l) => l.pendingValidation).length} pending validation
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-8 pb-8 scrollbar-thin">
          <div className="flex min-w-max gap-4">
            {stages.map((stage) => {
              const items = filtered.filter((l) => l.stage === stage.id);
              const stageValue = items.reduce((s, l) => s + l.value, 0);
              const isOver = dragOverStage === stage.id;
              const dropOk = isOver && draggingLead && canDrop(draggingLead, stage.id, user);
              const dropBad = isOver && draggingLead && !canDrop(draggingLead, stage.id, user);
              return (
                <div key={stage.id} className="flex w-[300px] shrink-0 flex-col"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(stage.id); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null); }}
                  onDrop={(e) => handleDrop(e, stage.id)}>
                  <div className={cn("mb-3 flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-3 py-2 ring-1 transition-colors",
                    dropOk && "border-success/60 bg-success/5 ring-success/30",
                    dropBad && "border-destructive/60 bg-destructive/5 ring-destructive/30",
                    !isOver && toneRing[stage.tone])}>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", dropOk ? "bg-success" : dropBad ? "bg-destructive" : toneDot[stage.tone])} />
                      <span className="text-sm font-medium">{stage.name}</span>
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{items.length}</span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">{(stageValue / 1000).toFixed(0)}k TND</span>
                  </div>
                  {isOver && (
                    <div className={cn("mb-2 flex h-10 items-center justify-center rounded-xl border border-dashed text-xs font-medium",
                      dropOk ? "border-success/50 text-success" : "border-destructive/50 text-destructive")}>
                      {dropOk ? "Drop here" : "Cannot move backwards"}
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {items.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} isDragging={draggingId === lead.id} canDrag={!!user}
                        onOpen={() => setActiveLead(lead)}
                        onValidate={canValidate(user) ? () => validateLead(lead.id) : undefined}
                        onDragStart={(e) => handleDragStart(e, lead)} onDragEnd={handleDragEnd} />
                    ))}
                    {items.length === 0 && !isOver && (
                      <button className="flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        onClick={() => setShowNewLead(true)}>
                        <Plus className="mr-1 h-3 w-3" /> Add lead
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>}

      {activeLead && (
        <LeadSheet lead={activeLead} user={user} onClose={() => setActiveLead(null)}
          onValidate={canValidate(user) ? () => validateLead(activeLead.id) : undefined}
          onMove={(stageId) => initiateMove(activeLead.id, stageId)} />
      )}

      {showNewLead && (
        <NewLeadDialog user={user} onClose={() => setShowNewLead(false)}
          onAdd={(lead) => {
            const isNonAdmin = user?.role === "oc" || user?.role === "ocvp";
            const newLead: Lead = {
              ...lead,
              id: `L-${Date.now().toString().slice(-5)}`,
              workspaceId: workspace,
              keyAreaId: user?.role === "oc" ? (user.keyAreaId ?? "sales") : lead.keyAreaId,
              assigneeId: user?.id,
              assignee: { name: user?.name ?? "Unknown", initials: (user?.name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(), hue: user?.hue ?? 220 },
              validated: !isNonAdmin,
              pendingValidation: isNonAdmin,
              stage: "new",
              updatedAt: "Just now",
            };
            saveLeads([...leads, newLead]);
            if (isNonAdmin) {
              push({ type: "lead_pending", title: "New lead awaiting validation", message: `${user?.name} added "${lead.company}" — needs admin approval.`, leadId: newLead.id, targetRole: "admin", targetUserId: null, workspaceId: newLead.workspaceId });
              toast.info("Lead submitted — waiting for admin validation");
            } else {
              toast.success(`"${lead.company}" added`);
            }
            setShowNewLead(false);
          }} />
      )}

      {pendingMove && (
        <StageTransitionDialog
          lead={leads.find((l) => l.id === pendingMove.leadId)!}
          targetStage={pendingMove.targetStage}
          onConfirm={(data) => applyMove(pendingMove.leadId, pendingMove.targetStage, data)}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </>
  );
}

// ─── StageTransitionDialog ─────────────────────────────────────────────────────
function StageTransitionDialog({ lead, targetStage, onConfirm, onCancel }: {
  lead: Lead; targetStage: StageId;
  onConfirm: (data: LeadStageData) => void;
  onCancel: () => void;
}) {
  const stageName = stages.find((s) => s.id === targetStage)?.name ?? targetStage;

  // Contacted
  const [contactOutput, setContactOutput] = useState("");
  const [contactMethod, setContactMethod] = useState<"cold_call" | "cold_email">("cold_call");

  // Meeting
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("10:00");
  const [meetFormat, setMeetFormat] = useState<"google_meet" | "physical">("physical");
  const [meetLocation, setMeetLocation] = useState("");

  // Proposal
  const [estimatedBudget, setEstimatedBudget] = useState("");

  // Confirmed
  const [amount, setAmount] = useState("");
  const [services, setServices] = useState("");
  const [links, setLinks] = useState("");

  // Lost
  const [lostReason, setLostReason] = useState("");
  const [openToFuture, setOpenToFuture] = useState(false);

  const handleSubmit = () => {
    const data: LeadStageData = {};
    if (targetStage === "contacted") {
      if (!contactOutput.trim()) { toast.error("Please describe the contact output."); return; }
      data.contacted = { contactOutput: contactOutput.trim(), method: contactMethod };
    } else if (targetStage === "meeting") {
      if (!meetDate || !meetTime) { toast.error("Please enter meeting date and time."); return; }
      data.meeting = { date: meetDate, time: meetTime, format: meetFormat, location: meetLocation.trim() || undefined };
    } else if (targetStage === "proposal") {
      if (!estimatedBudget) { toast.error("Please enter estimated budget."); return; }
      data.proposal = { estimatedBudget: Number(estimatedBudget) };
    } else if (targetStage === "confirmed") {
      if (!amount || !services.trim()) { toast.error("Amount and services are required."); return; }
      data.confirmed = { amount: Number(amount), services: services.trim(), links: links.trim() };
    } else if (targetStage === "lost") {
      if (!lostReason.trim()) { toast.error("Please enter a reason."); return; }
      data.lost = { reason: lostReason.trim(), openToFuture };
    }
    onConfirm(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
        <button onClick={onCancel} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <h3 className="font-display font-semibold mb-1">Moving to: {stageName}</h3>
        <p className="text-xs text-muted-foreground mb-4">{lead.company} · Fill in the details for this stage.</p>

        <div className="space-y-3">
          {targetStage === "contacted" && (
            <>
              <Field label="Contact method">
                <div className="flex gap-2">
                  {(["cold_call", "cold_email"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setContactMethod(m)}
                      className={cn("flex-1 flex items-center justify-center gap-2 rounded-xl border py-2 text-sm transition",
                        contactMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                      {m === "cold_call" ? <PhoneCall className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      {m === "cold_call" ? "Cold Call" : "Cold Email"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="What was the outcome of the contact? *">
                <textarea value={contactOutput} onChange={(e) => setContactOutput(e.target.value)} rows={3}
                  placeholder="e.g. Interested, wants to see a proposal next week…"
                  className={cn(inputCls, "resize-none h-auto py-2")} />
              </Field>
            </>
          )}

          {targetStage === "meeting" && (
            <>
              <Field label="Meeting format">
                <div className="flex gap-2">
                  {(["google_meet", "physical"] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setMeetFormat(f)}
                      className={cn("flex-1 flex items-center justify-center gap-2 rounded-xl border py-2 text-sm transition",
                        meetFormat === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                      {f === "google_meet" ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {f === "google_meet" ? "Google Meet" : "Physical"}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date *">
                  <input type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Time *">
                  <input type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} className={inputCls} />
                </Field>
              </div>
              {meetFormat === "physical" && (
                <Field label="Location">
                  <input value={meetLocation} onChange={(e) => setMeetLocation(e.target.value)}
                    placeholder="e.g. Hub 51, Tunis" className={inputCls} />
                </Field>
              )}
            </>
          )}

          {targetStage === "proposal" && (
            <Field label="Estimated budget (TND) *">
              <div className="relative">
                <Banknote className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="number" min="0" value={estimatedBudget} onChange={(e) => setEstimatedBudget(e.target.value)}
                  placeholder="e.g. 15000" className={cn(inputCls, "pl-9")} />
              </div>
            </Field>
          )}

          {targetStage === "confirmed" && (
            <>
              <Field label="Confirmed amount (TND) *">
                <div className="relative">
                  <Banknote className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 12000" className={cn(inputCls, "pl-9")} />
                </div>
              </Field>
              <Field label="Services provided (comma-separated) *">
                <input value={services} onChange={(e) => setServices(e.target.value)}
                  placeholder="e.g. Logo on banner, booth, social mention" className={inputCls} />
              </Field>
              <Field label="Logo / service links (comma-separated)">
                <input value={links} onChange={(e) => setLinks(e.target.value)}
                  placeholder="https://partner.com/logo.png, https://…" className={inputCls} />
              </Field>
            </>
          )}

          {targetStage === "lost" && (
            <>
              <Field label="Why was this deal lost? *">
                <textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={3}
                  placeholder="e.g. Budget constraints, went with a competitor…"
                  className={cn(inputCls, "resize-none h-auto py-2")} />
              </Field>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={openToFuture} onChange={(e) => setOpenToFuture(e.target.checked)}
                  className="h-4 w-4 accent-primary" />
                <span className="text-sm">Open to future opportunities with us?</span>
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
          <button onClick={handleSubmit} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            Confirm move →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MeetingCalendar ──────────────────────────────────────────────────────────
function MeetingCalendar({ meetings, workspace, leads, wsMembers, canEdit, isAdmin, onSave }: {
  meetings: Meeting[]; workspace: string; leads: Lead[];
  wsMembers: WorkspaceMember[]; canEdit: boolean; isAdmin: boolean;
  onSave: (u: Meeting[]) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ partnerName: "", leadId: "", date: "", time: "", location: "", assignedOcId: "", notes: "", status: "scheduled" as Meeting["status"] });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    meetings.forEach((m) => { if (!map[m.date]) map[m.date] = []; map[m.date].push(m); });
    return map;
  }, [meetings]);

  const selectedMeetings = selectedDay ? (meetingsByDate[selectedDay] ?? []) : [];
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;

  const openNew = (date?: string) => {
    setEditingId(null);
    setForm({ partnerName: "", leadId: "", date: date ?? "", time: "10:00", location: "", assignedOcId: wsMembers[0]?.id ?? "", notes: "", status: "scheduled" });
    setShowForm(true);
  };
  const openEdit = (m: Meeting) => {
    setEditingId(m.id);
    setForm({ partnerName: m.partnerName, leadId: m.leadId ?? "", date: m.date, time: m.time, location: m.location, assignedOcId: m.assignedOcId, notes: m.notes, status: m.status });
    setShowForm(true);
  };
  const handleSubmit = () => {
    if (!form.partnerName || !form.date || !form.time) { toast.error("Partner name, date and time required."); return; }
    const oc = wsMembers.find((m) => m.id === form.assignedOcId);
    if (editingId) {
      onSave(meetings.map((m) => m.id === editingId ? { ...m, ...form, leadId: form.leadId || undefined, assignedOcName: oc?.name ?? "", assignedOcHue: oc?.hue ?? 220 } : m));
      toast.success("Meeting updated.");
    } else {
      const m: Meeting = { id: `M-${Date.now()}`, workspaceId: workspace, ...form, leadId: form.leadId || undefined, assignedOcName: oc?.name ?? "", assignedOcHue: oc?.hue ?? 220 };
      onSave([...meetings, m]);
      toast.success("Meeting scheduled.");
    }
    setShowForm(false);
  };
  const deleteMeeting = (id: string) => {
    if (!isAdmin) { toast.error("Only admins can delete."); return; }
    onSave(meetings.filter((m) => m.id !== id));
  };
  const statusColor = { scheduled: "bg-info", completed: "bg-success", cancelled: "bg-destructive" };

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }} className="rounded-lg p-1.5 hover:bg-sidebar-accent/60 text-muted-foreground"><ChevronLeft className="h-4 w-4" /></button>
            <h3 className="font-display text-lg font-semibold">{monthName}</h3>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }} className="rounded-lg p-1.5 hover:bg-sidebar-accent/60 text-muted-foreground"><ChevronRight className="h-4 w-4" /></button>
          </div>
          {canEdit && <button onClick={() => openNew()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" />Add Meeting</button>}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/60">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-sidebar-accent/30 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="bg-card min-h-[80px]" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const ds = dateStr(day);
            const dayMeetings = meetingsByDate[ds] ?? [];
            const isToday = ds === today.toISOString().slice(0, 10);
            const isSelected = selectedDay === ds;
            return (
              <div key={ds} onClick={() => setSelectedDay(isSelected ? null : ds)}
                className={cn("bg-card min-h-[80px] p-2 cursor-pointer transition hover:bg-sidebar-accent/30", isSelected && "bg-sidebar-accent/60 ring-2 ring-primary/30")}>
                <div className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1", isToday && "bg-primary text-primary-foreground")}>{day}</div>
                <div className="space-y-0.5">
                  {dayMeetings.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] truncate bg-primary/10 text-primary">
                      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusColor[m.status])} />{m.time} {m.partnerName}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayMeetings.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-80 shrink-0 border-l border-border/60 flex flex-col">
        <div className="px-4 py-4 border-b border-border/40">
          <div className="text-sm font-semibold">{selectedDay ? new Date(selectedDay + "T00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "Select a day"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedMeetings.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              {selectedDay ? "No meetings this day." : "Click a day to see meetings."}
              {selectedDay && canEdit && <div className="mt-3"><button onClick={() => openNew(selectedDay)} className="text-primary hover:underline text-xs"><Plus className="h-3 w-3 inline" /> Schedule meeting</button></div>}
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {selectedMeetings.map((m) => (
                <div key={m.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{m.partnerName}</div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", m.status === "scheduled" ? "bg-info/10 text-info ring-info/30" : m.status === "completed" ? "bg-success/10 text-success ring-success/30" : "bg-destructive/10 text-destructive ring-destructive/30")}>{m.status}</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{m.time}</div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{m.location}</div>
                    <div className="flex items-center gap-1.5"><User className="h-3 w-3" />{m.assignedOcName}</div>
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                  {canEdit && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openEdit(m)} className="flex-1 rounded-lg border border-border/60 py-1 text-xs hover:bg-sidebar-accent/40">Edit</button>
                      {isAdmin && <button onClick={() => deleteMeeting(m.id)} className="rounded-lg border border-destructive/30 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/5">Del</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowForm(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="font-display font-semibold mb-4">{editingId ? "Edit Meeting" : "Schedule Meeting"}</h3>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Partner / Company</label><input value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Related Lead (optional)</label>
                <select value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">None</option>
                  {leads.filter(l => l.workspaceId === workspace).map((l) => <option key={l.id} value={l.id}>{l.company}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Time</label><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Assigned OC</label>
                <select value={form.assignedOcId} onChange={(e) => setForm({ ...form, assignedOcId: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {wsMembers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role.toUpperCase()})</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" /></div>
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

// ─── LeadCard ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, isDragging, canDrag, onOpen, onValidate, onDragStart, onDragEnd }: {
  lead: Lead; isDragging: boolean; canDrag: boolean; onOpen: () => void;
  onValidate?: () => void; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void;
}) {
  return (
    <div draggable={canDrag} onDragStart={onDragStart} onDragEnd={onDragEnd}
      className={cn("group relative w-full cursor-grab rounded-xl border border-border/60 bg-card/80 p-3 text-left backdrop-blur-xl transition",
        "hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_var(--primary)]", "active:cursor-grabbing",
        isDragging && "opacity-40 ring-2 ring-primary/30")}>
      {lead.pendingValidation && (
        <span className="absolute -top-1.5 left-3 inline-flex items-center gap-1 rounded-md bg-warning/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
          <ShieldAlert className="h-2.5 w-2.5" /> Pending
        </span>
      )}
      <button className="w-full text-left" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{lead.company}</div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {lead.companyType && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md text-muted-foreground">{lead.companyType}</span>}
              {lead.address && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{lead.address}</span>}
            </div>
          </div>
          <Avatar name={lead.assignee.name} hue={lead.assignee.hue} size={26} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">{lead.contact}</div>
          <div className="font-mono text-xs font-semibold">{(lead.value / 1000).toFixed(0)}k TND</div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted/60">
            <div className="h-full rounded-full bg-[var(--gradient-primary)]" style={{ width: `${lead.probability}%` }} />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{lead.probability}%</span>
        </div>
        {lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.tags.map((t) => <span key={t} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{lead.source}</span><span>{lead.updatedAt}</span>
        </div>
      </button>
      {onValidate && lead.pendingValidation && (
        <button onClick={(e) => { e.stopPropagation(); onValidate(); }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-success/40 bg-success/10 py-1 text-[11px] font-medium text-success transition hover:bg-success/20">
          <ShieldCheck className="h-3 w-3" /> Validate lead
        </button>
      )}
    </div>
  );
}

// ─── LeadSheet ────────────────────────────────────────────────────────────────
function LeadSheet({ lead, user, onClose, onValidate, onMove }: {
  lead: Lead; user: ReturnType<typeof useAuth>["user"];
  onClose: () => void; onValidate?: () => void; onMove: (stageId: StageId) => void;
}) {
  const stage = stages.find((s) => s.id === lead.stage)!;
  const forwardStages = stages.filter((s) => STAGE_ORDER[s.id] > STAGE_ORDER[lead.stage]);
  const sd = lead.stageData ?? {};

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-border/60 bg-card shadow-elegant">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{lead.id}</span>
              <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1", toneRing[stage.tone])}>
                <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[stage.tone])} /> {stage.name}
              </span>
              {lead.validated
                ? <span className="inline-flex items-center gap-1 text-[10px] text-success"><ShieldCheck className="h-3 w-3" /> Validated</span>
                : <span className="inline-flex items-center gap-1 text-[10px] text-warning"><ShieldAlert className="h-3 w-3" /> Pending</span>}
            </div>
            <h2 className="mt-2 truncate font-display text-2xl font-semibold">{lead.company}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {lead.companyType && <span className="text-xs bg-secondary px-2 py-0.5 rounded-md">{lead.companyType}</span>}
              {lead.address && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{lead.address}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{lead.industry} · {lead.interest}</p>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
          {onValidate && lead.pendingValidation && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-warning"><ShieldAlert className="h-4 w-4" /> Awaiting admin validation</div>
              <p className="mt-1 text-xs text-muted-foreground">Submitted by {lead.assignee.name}.</p>
              <button onClick={onValidate} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Validate this lead
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Value (TND)", value: fmtTND(lead.value) }, { label: "Probability", value: `${lead.probability}%` }, { label: "Source", value: lead.source }].map((m) => (
              <div key={m.label} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.label}</div>
                <div className="mt-1 font-mono text-base font-semibold">{m.value}</div>
              </div>
            ))}
          </div>

          <section>
            <SectionTitle icon={Building2}>Primary contact</SectionTitle>
            <div className="mt-3 rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={lead.contact} hue={(lead.assignee.hue + 60) % 360} size={40} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{lead.contact}</div>
                  <div className="truncate text-xs text-muted-foreground">{lead.email}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ContactChip icon={Mail} label={lead.email} />
                <ContactChip icon={Phone} label={lead.phone} />
                <ContactChip icon={LinkedinIcon} label={lead.linkedin} />
              </div>
            </div>
          </section>

          {/* Stage data summary */}
          {Object.keys(sd).length > 0 && (
            <section>
              <SectionTitle icon={TrendingUp}>Stage details</SectionTitle>
              <div className="mt-3 space-y-2">
                {sd.contacted && (
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Contacted</div>
                    <div className="flex items-center gap-2 text-xs">
                      {sd.contacted.method === "cold_call" ? <PhoneCall className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                      <span className="capitalize">{sd.contacted.method.replace("_", " ")}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{sd.contacted.contactOutput}</p>
                  </div>
                )}
                {sd.meeting && (
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Meeting</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{sd.meeting.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{sd.meeting.time}</span>
                      <span className="flex items-center gap-1">{sd.meeting.format === "google_meet" ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{sd.meeting.format === "google_meet" ? "Google Meet" : sd.meeting.location ?? "Physical"}</span>
                    </div>
                  </div>
                )}
                {sd.proposal && (
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Proposal</div>
                    <div className="text-sm font-semibold">{fmtTND(sd.proposal.estimatedBudget)}</div>
                  </div>
                )}
                {sd.confirmed && (
                  <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-success mb-1">Confirmed Partner</div>
                    <div className="text-sm font-semibold">{fmtTND(sd.confirmed.amount)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Services: {sd.confirmed.services}</p>
                    {sd.confirmed.links && <p className="mt-1 text-xs text-primary break-all">{sd.confirmed.links}</p>}
                  </div>
                )}
                {sd.lost && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-destructive mb-1">Lost Deal</div>
                    <p className="text-sm text-muted-foreground">{sd.lost.reason}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      {sd.lost.openToFuture ? <CheckCircle2 className="h-3 w-3 text-success" /> : <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                      <span>{sd.lost.openToFuture ? "Open to future opportunities" : "Not open to future opportunities"}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {lead.notes && (
            <section>
              <SectionTitle icon={MessageCircle}>Notes</SectionTitle>
              <p className="mt-2 rounded-xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed text-muted-foreground">{lead.notes}</p>
            </section>
          )}

          <div className="rounded-xl border border-primary/30 bg-[var(--gradient-primary)] p-4 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" /> AI insight</div>
            <p className="mt-2 text-sm leading-snug">
              {lead.stage === "negotiation" ? "Consider sending a tailored case study with ROI data to accelerate the close." :
               lead.stage === "proposal" ? "Follow up within 48h — proposals lose 60% chance of closing after one week without contact." :
               lead.stage === "meeting" ? "Prepare a clear agenda and send it 24h before the meeting." :
               "Stay consistent with follow-ups and document every touchpoint."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 bg-background/40 p-4">
          <button className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary">
            <Mail className="h-4 w-4" /> Email
          </button>
          <button className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary">
            <Calendar className="h-4 w-4" /> Schedule
          </button>
          {forwardStages.length > 0 && (
            <div className="relative flex-1">
              <select className="h-9 w-full appearance-none rounded-lg bg-[var(--gradient-primary)] pl-3 pr-7 text-sm font-medium text-primary-foreground hover:opacity-90 cursor-pointer"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { onMove(e.target.value as StageId); e.target.value = ""; } }}
                disabled={!lead.validated && user?.role !== "admin" && user?.role !== "ocp"}>
                <option value="" disabled>{!lead.validated && user?.role !== "admin" && user?.role !== "ocp" ? "Needs validation" : "Move stage ▸"}</option>
                {forwardStages.map((s) => <option key={s.id} value={s.id}>→ {s.name}</option>)}
              </select>
              <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary-foreground/70" />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── NewLeadDialog ────────────────────────────────────────────────────────────
type LeadDraft = Omit<Lead, "id" | "assignee" | "assigneeId" | "validated" | "pendingValidation" | "stage" | "updatedAt" | "workspaceId" | "stageData">;

function NewLeadDialog({ user, onClose, onAdd }: {
  user: ReturnType<typeof useAuth>["user"];
  onClose: () => void;
  onAdd: (draft: LeadDraft & { keyAreaId: string }) => void;
}) {
  const isOC = user?.role === "oc";
  const [form, setForm] = useState({
    company: "", companyType: "", companyTypeCustom: "", address: "", addressCustom: "",
    industry: "", contact: "", email: "", phone: "", linkedin: "", notes: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const resolvedCompanyType = form.companyType === "__other__" ? form.companyTypeCustom : form.companyType;
  const resolvedAddress = form.address === "__other__" ? form.addressCustom : form.address;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-border/60 bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border/60 p-5">
          <div>
            <h2 className="font-display text-xl font-semibold">New lead</h2>
            {isOC && <p className="mt-0.5 text-xs text-warning">Will be submitted for admin validation</p>}
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!form.company.trim()) return;
          onAdd({
            company: form.company, companyType: resolvedCompanyType, address: resolvedAddress,
            industry: form.industry, contact: form.contact, email: form.email, phone: form.phone,
            linkedin: form.linkedin, interest: "", value: 0,
            probability: 50, source: "Inbound", notes: form.notes,
            tags: [], keyAreaId: user?.keyAreaId ?? "sales",
          });
        }} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 p-5">
            <Field label="Company *">
              <input required value={form.company} onChange={set("company")} placeholder="Acme Corp" className={inputCls} />
            </Field>

            <Field label="Company type">
              <select value={form.companyType} onChange={set("companyType")} className={inputCls}>
                <option value="">Select type…</option>
                {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="__other__">Other…</option>
              </select>
              {form.companyType === "__other__" && (
                <input value={form.companyTypeCustom} onChange={set("companyTypeCustom")} placeholder="Specify type" className={cn(inputCls, "mt-2")} />
              )}
            </Field>

            <Field label="Address (City)">
              <select value={form.address} onChange={set("address")} className={inputCls}>
                <option value="">Select city…</option>
                {TUNISIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__other__">Other…</option>
              </select>
              {form.address === "__other__" && (
                <input value={form.addressCustom} onChange={set("addressCustom")} placeholder="Specify address" className={cn(inputCls, "mt-2")} />
              )}
            </Field>

            <Field label="Industry"><input value={form.industry} onChange={set("industry")} placeholder="Tech / SaaS" className={inputCls} /></Field>
            <Field label="Contact name"><input value={form.contact} onChange={set("contact")} placeholder="Jane Doe" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"><input type="email" value={form.email} onChange={set("email")} placeholder="jane@acme.com" className={inputCls} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={set("phone")} placeholder="+216 55 000 000" className={inputCls} /></Field>
            </div>
            <Field label="LinkedIn"><input value={form.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/jane" className={inputCls} /></Field>
            <Field label="Notes"><textarea value={form.notes} onChange={set("notes")} placeholder="Any context…" rows={3} className={cn(inputCls, "resize-none")} /></Field>
          </div>
          <div className="flex gap-2 border-t border-border/60 p-4">
            <button type="button" onClick={onClose} className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
            <button type="submit" className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--gradient-primary)] text-sm font-medium text-primary-foreground hover:opacity-90">{isOC ? "Submit for validation" : "Add lead"}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const inputCls = "h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"><Icon className="h-3.5 w-3.5" />{children}</div>;
}

function ContactChip({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
