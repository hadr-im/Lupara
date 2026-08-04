import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Topbar } from "@/components/app/topbar";
import { Avatar } from "@/components/app/avatar";
import { workspaces, TUNISIAN_CITIES } from "@/lib/mock/data";
import { getPrPeople, upsertPrPerson, getTalks } from "@/lib/db/server-fns";
import type { PRPerson, PRStageId } from "@/lib/types";
import { prStages, PR_STAGE_ORDER } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Plus, X, Search, Mic, Tv, ChevronRight, Calendar, Clock, MapPin, Mail,
  Phone, Building2, MessageCircle, Globe, Sparkles, Tag, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/$workspace/pr")({
  component: PRPage,
});

const toneRing: Record<string, string> = {
  info: "ring-info/40", warning: "ring-warning/40",
  success: "ring-success/40", destructive: "ring-destructive/40",
};
const toneDot: Record<string, string> = {
  info: "bg-info", warning: "bg-warning", success: "bg-success", destructive: "bg-destructive",
};

const STAGE_PROMPTS: Record<PRStageId, string> = {
  contact: "",
  contacted: "Describe how the contact went and any notes from the conversation.",
  negotiation: "What are the key negotiation points? Terms, fees, requirements?",
  confirmed: "Confirm the date and time of their intervention.",
  rejected: "Why was this person rejected or declined?",
};

function PRPage() {
  const { workspace } = Route.useParams();
  const { user, isAdmin } = useAuth();

  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace.toUpperCase();

  const [tab, setTab] = useState<"speaker" | "media">("speaker");
  const [query, setQuery] = useState("");

  // PR people are shared across all workspaces — but we show all for context
  const [prPeople, setPRPeople] = useState<PRPerson[]>([]);
  const prRef = useRef<PRPerson[]>([]);
  const [talks, setTalks] = useState<{ id: string; name: string; type: string }[]>([]);

  useEffect(() => {
    getPrPeople({ data: { workspaceId: workspace } })
      .then((rows) => { const d = rows as PRPerson[]; setPRPeople(d); prRef.current = d; })
      .catch(() => {});
  }, [workspace]);

  useEffect(() => {
    getTalks({ data: { workspaceId: workspace } })
      .then((rows) => setTalks(rows as any))
      .catch(console.error);
  }, [workspace]);

  const savePR = useCallback((updated: PRPerson[]) => {
    const prev = prRef.current;
    prRef.current = updated;
    setPRPeople(updated);
    for (const p of updated) {
      const old = prev.find((x) => x.id === p.id);
      if (!old ||
          old.stage !== p.stage ||
          JSON.stringify(old.stageNotes) !== JSON.stringify(p.stageNotes) ||
          old.biography !== p.biography ||
          old.imageUrl !== p.imageUrl ||
          old.linkedinUrl !== p.linkedinUrl ||
          old.instagramUrl !== p.instagramUrl ||
          old.talkId !== p.talkId ||
          old.location !== p.location) {
        upsertPrPerson({ data: {
          id: p.id, workspaceId: p.workspaceId ?? workspace,
          type: p.type, name: p.name, organization: p.organization,
          email: p.email, phone: p.phone, topic: p.topic,
          mediaType: p.mediaType, stage: p.stage,
          stageNotes: p.stageNotes as Record<string, string>,
          confirmedDate: p.confirmedDate, confirmedTime: p.confirmedTime,
          rejectedReason: p.rejectedReason, assigneeId: p.assigneeId,
          biography: p.biography, imageUrl: p.imageUrl,
          linkedinUrl: p.linkedinUrl, instagramUrl: p.instagramUrl,
          talkId: p.talkId, location: p.location,
        }}).catch(console.error);
      }
    }
  }, [workspace]);

  const [activePerson, setActivePerson] = useState<PRPerson | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ personId: string; targetStage: PRStageId } | null>(null);

  // Show the current workspace's people (PR is shared for TEDx + MeetupPro; PM&EWA sees all)
  const scoped = useMemo(() => {
    if (workspace === "pmewa" || isAdmin) return prPeople;
    return prPeople.filter((p) => p.workspaceId === workspace);
  }, [prPeople, workspace, isAdmin]);

  const filtered = useMemo(() => {
    const type = scoped.filter((p) => p.type === tab);
    const q = query.toLowerCase().trim();
    if (!q) return type;
    return type.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.organization.toLowerCase().includes(q) ||
      p.topic?.toLowerCase().includes(q) ||
      p.mediaType?.toLowerCase().includes(q),
    );
  }, [scoped, tab, query]);

  const canMove = (p: PRPerson, targetStage: PRStageId) => {
    if (PR_STAGE_ORDER[targetStage] <= PR_STAGE_ORDER[p.stage]) return false;
    if (isAdmin || user?.role === "ocp" || user?.role === "ocvp") return true;
    if (user?.role === "oc" && p.assigneeId === user.id) return true;
    return false;
  };

  const initiateMove = (personId: string, targetStage: PRStageId) => {
    const p = prPeople.find((x) => x.id === personId);
    if (!p) return;
    if (PR_STAGE_ORDER[targetStage] <= PR_STAGE_ORDER[p.stage]) {
      toast.error("PR pipeline is forward-only.");
      return;
    }
    setPendingMove({ personId, targetStage });
  };

  const applyMove = (personId: string, targetStage: PRStageId, notes: string, confirmedDate?: string, confirmedTime?: string) => {
    const updated = prPeople.map((p) => {
      if (p.id !== personId) return p;
      const newNotes = { ...p.stageNotes, [targetStage]: notes };
      return {
        ...p,
        stage: targetStage,
        stageNotes: newNotes,
        confirmedDate: targetStage === "confirmed" ? confirmedDate : p.confirmedDate,
        confirmedTime: targetStage === "confirmed" ? confirmedTime : p.confirmedTime,
        rejectedReason: targetStage === "rejected" ? notes : p.rejectedReason,
        updatedAt: "Just now",
      };
    });
    savePR(updated);
    const stageName = prStages.find((s) => s.id === targetStage)?.name ?? targetStage;
    toast.success(`Moved to ${stageName}`);
    setPendingMove(null);
    // Update active person
    if (activePerson?.id === personId) {
      setActivePerson(updated.find((p) => p.id === personId) ?? null);
    }
  };

  const addPerson = (draft: Omit<PRPerson, "id" | "updatedAt" | "stageNotes">) => {
    const newPerson: PRPerson = {
      ...draft,
      id: `PR-${Date.now()}`,
      stageNotes: {},
      updatedAt: "Just now",
    };
    savePR([...prPeople, newPerson]);
    toast.success(`${draft.name} added to PR pipeline`);
    setShowNew(false);
  };

  const confirmedToday = filtered.filter((p) => p.stage === "confirmed").length;
  const totalConfirmed = filtered.filter((p) => p.stage === "confirmed").length;

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Public Relations" }]}
        title="Public Relations"
        subtitle={`${tab === "speaker" ? "Speakers" : "Media"} pipeline · ${filtered.length} people · ${totalConfirmed} confirmed`}
        action={
          <button onClick={() => setShowNew(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--gradient-primary)] px-3 text-xs font-medium text-primary-foreground shadow-card hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add {tab === "speaker" ? "Speaker" : "Media"}
          </button>
        }
      />

      {/* Type tabs */}
      <div className="border-b border-border/60 px-8">
        <div className="flex gap-1">
          {[{ id: "speaker", label: "Speakers", icon: Mic }, { id: "media", label: "Media", icon: Tv }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn("inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition",
                tab === t.id ? "border-border/60 bg-card text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <t.icon className="h-4 w-4" />{t.label}
              <span className="rounded-full bg-secondary px-1.5 text-[10px] font-mono text-muted-foreground">
                {scoped.filter(p => p.type === t.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-8 py-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab === "speaker" ? "speakers, topics" : "media, type"}…`}
            className="h-9 w-full rounded-lg border border-border bg-card/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none" />
        </div>
      </div>

      {/* Pipeline board */}
      <div className="flex-1 overflow-x-auto px-8 pb-8 scrollbar-thin">
        <div className="flex min-w-max gap-4">
          {prStages.map((stage) => {
            const items = filtered.filter((p) => p.stage === stage.id);
            return (
              <div key={stage.id} className="flex w-[280px] shrink-0 flex-col">
                <div className={cn("mb-3 flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-3 py-2 ring-1", toneRing[stage.tone])}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", toneDot[stage.tone])} />
                    <span className="text-sm font-medium">{stage.name}</span>
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {items.map((person) => (
                    <PRCard key={person.id} person={person} onOpen={() => setActivePerson(person)}
                      onMove={(targetStage) => initiateMove(person.id, targetStage)}
                      canMove={(targetStage) => canMove(person, targetStage)} />
                  ))}
                  {items.length === 0 && (
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

      {activePerson && (
        <PRSheet person={activePerson} onClose={() => setActivePerson(null)}
          onMove={(targetStage) => initiateMove(activePerson.id, targetStage)}
          canMove={(targetStage) => canMove(activePerson, targetStage)} talks={talks} />
      )}

      {showNew && (
        <NewPRDialog type={tab} workspace={workspace} onClose={() => setShowNew(false)} onAdd={addPerson} />
      )}

      {pendingMove && (
        <PRStageDialog
          person={prPeople.find((p) => p.id === pendingMove.personId)!}
          targetStage={pendingMove.targetStage}
          onConfirm={(notes, date, time) => applyMove(pendingMove.personId, pendingMove.targetStage, notes, date, time)}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </>
  );
}

// ─── PRCard ───────────────────────────────────────────────────────────────────
function PRCard({ person, onOpen, onMove, canMove }: {
  person: PRPerson; onOpen: () => void;
  onMove: (s: PRStageId) => void; canMove: (s: PRStageId) => boolean;
}) {
  const forwardStages = prStages.filter((s) => PR_STAGE_ORDER[s.id] > PR_STAGE_ORDER[person.stage]);
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-3 backdrop-blur-xl hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_var(--primary)] transition">
      <button className="w-full text-left" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {person.workspaceId !== "pmewa" && (
                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider">{person.workspaceId}</span>
              )}
            </div>
            <div className="truncate text-sm font-semibold mt-0.5">{person.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{person.organization}</div>
          </div>
          <div className={cn("shrink-0 rounded-lg p-1.5", person.type === "speaker" ? "bg-accent/10 text-accent" : "bg-info/10 text-info")}>
            {person.type === "speaker" ? <Mic className="h-3.5 w-3.5" /> : <Tv className="h-3.5 w-3.5" />}
          </div>
        </div>
        {person.topic && <div className="mt-2 text-[11px] text-muted-foreground italic truncate">"{person.topic}"</div>}
        {person.mediaType && <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"><Tv className="h-2.5 w-2.5" />{person.mediaType}</div>}
        {person.stage === "confirmed" && person.confirmedDate && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-success">
            <CheckCircle2 className="h-3 w-3" />
            {person.confirmedDate} · {person.confirmedTime}
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted-foreground">{person.updatedAt}</div>
      </button>
      {forwardStages.length > 0 && (
        <div className="relative mt-2">
          <select className="h-8 w-full appearance-none rounded-lg bg-primary/10 text-primary pl-2 pr-6 text-[11px] font-medium cursor-pointer border border-primary/20 hover:bg-primary/20 focus:outline-none"
            defaultValue=""
            onChange={(e) => { if (e.target.value && canMove(e.target.value as PRStageId)) { onMove(e.target.value as PRStageId); e.target.value = ""; } }}>
            <option value="" disabled>Move to…</option>
            {forwardStages.map((s) => <option key={s.id} value={s.id} disabled={!canMove(s.id)}>→ {s.name}</option>)}
          </select>
          <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-primary/70" />
        </div>
      )}
    </div>
  );
}

// ─── PRSheet ─────────────────────────────────────────────────────────────────
function PRSheet({ person, onClose, onMove, canMove, talks }: {
  person: PRPerson; onClose: () => void;
  onMove: (s: PRStageId) => void; canMove: (s: PRStageId) => boolean;
  talks: { id: string; name: string; type: string }[];
}) {
  const stage = prStages.find((s) => s.id === person.stage)!;
  const forwardStages = prStages.filter((s) => PR_STAGE_ORDER[s.id] > PR_STAGE_ORDER[person.stage]);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-border/60 bg-card shadow-elegant">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1", toneRing[stage.tone])}>
                <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[stage.tone])} />{stage.name}
              </span>
              <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md capitalize">{person.type}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider">{person.workspaceId}</span>
            </div>
            <h2 className="mt-2 truncate font-display text-2xl font-semibold">{person.name}</h2>
            <p className="text-sm text-muted-foreground">{person.organization}</p>
          </div>
          <button onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
          {/* Contact info */}
          <section>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              <Building2 className="h-3.5 w-3.5" /> Contact info
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-2">
              {person.imageUrl && (
                <div className="mb-4 flex justify-center">
                  <img src={person.imageUrl} alt={person.name} className="h-24 w-24 rounded-full object-cover border border-border" />
                </div>
              )}
              {person.email && <div className="flex items-center gap-2 text-xs"><Mail className="h-3 w-3 text-muted-foreground" />{person.email}</div>}
              {person.phone && <div className="flex items-center gap-2 text-xs"><Phone className="h-3 w-3 text-muted-foreground" />{person.phone}</div>}
              {person.topic && <div className="flex items-center gap-2 text-xs"><Mic className="h-3 w-3 text-muted-foreground" />Topic: <span className="italic">{person.topic}</span></div>}
              {person.mediaType && <div className="flex items-center gap-2 text-xs"><Tv className="h-3 w-3 text-muted-foreground" />Media type: {person.mediaType}</div>}
              {person.location && <div className="flex items-center gap-2 text-xs"><MapPin className="h-3 w-3 text-muted-foreground" />Location: {person.location}</div>}
              {person.talkId && (
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="h-3 w-3 text-muted-foreground" />
                  {person.workspaceId === "tedx" ? "Talk: " : "Panel: "}
                  {talks.find((t) => t.id === person.talkId)?.name ?? person.talkId}
                </div>
              )}
              {(person.linkedinUrl || person.instagramUrl) && (
                <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                  {person.linkedinUrl && (
                    <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      LinkedIn
                    </a>
                  )}
                  {person.instagramUrl && (
                    <a href={person.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-500 hover:underline">
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>

          {person.biography && (
            <section>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Biography
              </div>
              <p className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {person.biography}
              </p>
            </section>
          )}

          {/* Confirmed info */}
          {person.stage === "confirmed" && (
            <section className="rounded-xl border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-success mb-2"><CheckCircle2 className="h-4 w-4" /> Confirmed</div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                {person.confirmedDate && <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{person.confirmedDate}</div>}
                {person.confirmedTime && <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{person.confirmedTime}</div>}
              </div>
            </section>
          )}

          {/* Rejected info */}
          {person.stage === "rejected" && person.rejectedReason && (
            <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive mb-2"><AlertCircle className="h-4 w-4" /> Rejected</div>
              <p className="text-sm text-muted-foreground">{person.rejectedReason}</p>
            </section>
          )}

          {/* Stage notes timeline */}
          {Object.keys(person.stageNotes).length > 0 && (
            <section>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3"><MessageCircle className="h-3.5 w-3.5" />Stage notes</div>
              <ol className="space-y-3 border-l border-border/60 pl-4">
                {prStages.filter((s) => person.stageNotes[s.id]).map((s) => (
                  <li key={s.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.name}</div>
                    <div className="text-sm mt-0.5">{person.stageNotes[s.id]}</div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="rounded-xl border border-primary/30 bg-[var(--gradient-primary)] p-4 text-primary-foreground">
            <div className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" /> AI insight</div>
            <p className="mt-2 text-sm leading-snug">
              {person.stage === "negotiation" ? "Clarify deliverables clearly before confirming. Define exclusivity, timing, and compensation in writing." :
               person.stage === "contacted" ? "Send a follow-up within 48h with the event brief and speaker/media kit." :
               person.stage === "confirmed" ? "Send a confirmation letter and logistics details at least 2 weeks before the event." :
               "Prepare a clear outreach message with event context and value proposition."}
            </p>
          </div>
        </div>

        {forwardStages.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border/60 bg-background/40 p-4">
            {forwardStages.map((s) => (
              <button key={s.id} onClick={() => onMove(s.id)} disabled={!canMove(s.id)}
                className={cn("flex-1 h-9 min-w-[100px] rounded-lg text-sm font-medium transition border",
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

// ─── PRStageDialog ────────────────────────────────────────────────────────────
function PRStageDialog({ person, targetStage, onConfirm, onCancel }: {
  person: PRPerson; targetStage: PRStageId;
  onConfirm: (notes: string, date?: string, time?: string) => void;
  onCancel: () => void;
}) {
  const stageName = prStages.find((s) => s.id === targetStage)?.name ?? targetStage;
  const [notes, setNotes] = useState("");
  const [confirmedDate, setConfirmedDate] = useState("");
  const [confirmedTime, setConfirmedTime] = useState("09:00");

  const handleSubmit = () => {
    if (targetStage === "confirmed" && (!confirmedDate || !confirmedTime)) {
      toast.error("Intervention date and time are required."); return;
    }
    if (targetStage !== "contact" && !notes.trim()) {
      toast.error("Please add notes for this stage."); return;
    }
    onConfirm(notes.trim(), confirmedDate || undefined, confirmedTime || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4">
        <button onClick={onCancel} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <h3 className="font-display font-semibold mb-1">→ {stageName}</h3>
        <p className="text-xs text-muted-foreground mb-4">{person.name} · {person.organization}</p>

        <div className="space-y-3">
          {targetStage === "confirmed" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Intervention date *</label>
                <input type="date" value={confirmedDate} onChange={(e) => setConfirmedDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Time *</label>
                <input type="time" value={confirmedTime} onChange={(e) => setConfirmedTime(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
              {STAGE_PROMPTS[targetStage] || "Notes"}{targetStage !== "contact" ? " *" : ""}
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder={STAGE_PROMPTS[targetStage] || "Add notes…"}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
          <button onClick={handleSubmit} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── NewPRDialog ──────────────────────────────────────────────────────────────
function NewPRDialog({ type, workspace, onClose, onAdd }: {
  type: "speaker" | "media"; workspace: string;
  onClose: () => void;
  onAdd: (draft: Omit<PRPerson, "id" | "updatedAt" | "stageNotes">) => void;
}) {
  const [form, setForm] = useState({
    name: "", organization: "", email: "", phone: "",
    topic: "", mediaType: "TV", location: "",
    biography: "", imageUrl: "", linkedinUrl: "", instagramUrl: "", talkId: "",
  });

  const [talks, setTalks] = useState<{ id: string; name: string; type: string }[]>([]);
  useEffect(() => {
    getTalks({ data: { workspaceId: workspace } })
      .then((rows) => setTalks(rows as any))
      .catch(console.error);
  }, [workspace]);

  const filteredTalks = talks.filter((t) => {
    if (workspace === "tedx") return t.type === "talk";
    if (workspace === "meetup") return t.type === "panel";
    return true;
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elegant mx-4 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        <h3 className="font-display font-semibold mb-4">New {type === "speaker" ? "Speaker" : "Media Contact"}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Full name *</label>
            <input value={form.name} onChange={set("name")} placeholder="Dr. Firstname Lastname"
              className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Organization *</label>
            <input value={form.organization} onChange={set("organization")} placeholder="Company / Institution"
              className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="name@org.com"
                className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Phone</label>
              <input value={form.phone} onChange={set("phone")} placeholder="+216 55 000 000"
                className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
          {type === "speaker" ? (
            <>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Talk topic</label>
                <input value={form.topic} onChange={set("topic")} placeholder="e.g. The Future of AI in Education"
                  className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Biography</label>
                <textarea value={form.biography} onChange={set("biography")} placeholder="Short bio..." rows={3}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Image URL</label>
                <input value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://example.com/image.jpg"
                  className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">LinkedIn Link</label>
                  <input value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="https://linkedin.com/..."
                    className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Instagram Link</label>
                  <input value={form.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/..."
                    className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
              {filteredTalks.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
                    {workspace === "tedx" ? "Talk *" : "Panel *"}
                  </label>
                  <select value={form.talkId} onChange={set("talkId")}
                    className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none">
                    <option value="">Select {workspace === "tedx" ? "talk" : "panel"}...</option>
                    {filteredTalks.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Media type</label>
                  <select value={form.mediaType} onChange={set("mediaType")}
                    className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none">
                    {["TV", "Radio", "Press", "Online", "Podcast", "Social Media"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Location (Tunisia)</label>
                  <select value={form.location} onChange={set("location")}
                    className="h-9 w-full rounded-lg border border-border bg-background/60 px-3 text-sm focus:border-primary focus:outline-none">
                    <option value="">Select governorate...</option>
                    {TUNISIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-sidebar-accent/40 transition">Cancel</button>
          <button onClick={() => {
            if (!form.name.trim() || !form.organization.trim()) { toast.error("Name and organization required."); return; }
            onAdd({
              type, workspaceId: workspace, name: form.name.trim(), organization: form.organization.trim(),
              email: form.email.trim(), phone: form.phone.trim(), topic: form.topic.trim() || undefined,
              mediaType: form.mediaType || undefined, stage: "contact", location: form.location || undefined,
              biography: form.biography.trim() || undefined, imageUrl: form.imageUrl.trim() || undefined,
              linkedinUrl: form.linkedinUrl.trim() || undefined, instagramUrl: form.instagramUrl.trim() || undefined,
              talkId: form.talkId || undefined,
            });
          }} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Add</button>
        </div>
      </div>
    </div>
  );
}
