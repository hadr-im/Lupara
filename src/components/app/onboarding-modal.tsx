import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  X, Sparkles, LayoutDashboard, TrendingUp, Users, CalendarDays,
  ClipboardList, ChevronRight, CheckCircle2, Shield, Star, Zap,
  Globe2, Megaphone, Truck, FileText, MapPin,
} from "lucide-react";

const STORAGE_KEY = "nucleus_onboarding_seen_v1";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Lupara",
    subtitle: "Your AIESEC Operations OS",
    icon: Sparkles,
    iconColor: "from-purple-500 to-fuchsia-500",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lupara is a unified operations platform for managing AIESEC events and departments.
          It brings together sales pipelines, task boards, team coordination, and experience
          planning in one place — tailored to your role.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: LayoutDashboard, label: "Workspace Dashboard", desc: "Live KPIs and activity" },
            { icon: TrendingUp, label: "Sales Pipeline", desc: "Leads & sponsorship" },
            { icon: Sparkles, label: "DXP / Experience", desc: "Event experience design" },
            { icon: ClipboardList, label: "Tasks & Dispatch", desc: "Area task boards" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/60 p-3">
              <f.icon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div>
                <div className="text-xs font-semibold">{f.label}</div>
                <div className="text-[11px] text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "workspaces",
    title: "Workspaces",
    subtitle: "Events & Departments",
    icon: LayoutDashboard,
    iconColor: "from-blue-500 to-cyan-500",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Each <strong className="text-foreground">workspace</strong> is either an event or a department.
          You'll only see workspaces your admin has given you access to.
        </p>
        <div className="space-y-2">
          {[
            { short: "TX", color: "from-fuchsia-500 to-rose-500", name: "TEDx", type: "Event workspace", desc: "Full event ops: sales, DXP, logistics, marketing, PR, content." },
            { short: "MP", color: "from-violet-500 to-indigo-500", name: "MeetupPro", type: "Event workspace", desc: "Same structure as TEDx — scoped to MeetupPro." },
            { short: "PE", color: "from-cyan-500 to-emerald-500", name: "PM & EWA", type: "Department", desc: "Project management — task assignment, team coordination, calendar." },
          ].map((w) => (
            <div key={w.name} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white", w.color)}>
                {w.short}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{w.name}</div>
                <div className="text-[11px] text-muted-foreground">{w.type} · {w.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "areas",
    title: "Key Areas",
    subtitle: "Event functional areas",
    icon: Zap,
    iconColor: "from-amber-500 to-orange-500",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Each event workspace is divided into <strong className="text-foreground">Key Areas</strong>.
          Your access is restricted to the area(s) your admin assigns you.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Sparkles, label: "DXP / Experience", color: "text-fuchsia-400", desc: "Physical setup, 1-on-1s, agenda, email templates, D-Day dispatch, WhatsApp timeline" },
            { icon: TrendingUp, label: "Sales", color: "text-blue-400", desc: "Leads pipeline, partner meetings, sponsorship tracking" },
            { icon: Truck, label: "Logistics", color: "text-emerald-400", desc: "Venue, catering, transport, equipment" },
            { icon: Megaphone, label: "Marketing", color: "text-amber-400", desc: "Campaigns, social media, influencers" },
            { icon: Globe2, label: "Public Relations", color: "text-purple-400", desc: "Press kits, media partners, coverage" },
            { icon: FileText, label: "Content", color: "text-cyan-400", desc: "Speakers, scripts, booklets, videos" },
          ].map((a) => (
            <div key={a.label} className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/40 p-2.5">
              <a.icon className={cn("h-4 w-4 shrink-0 mt-0.5", a.color)} />
              <div>
                <div className="text-xs font-semibold">{a.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "roles",
    title: "Your Role & Permissions",
    subtitle: "What you can see and do",
    icon: Shield,
    iconColor: "from-emerald-500 to-teal-500",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Lupara uses role-based access. Each user is assigned one of these roles by an admin.
        </p>
        <div className="space-y-2">
          {[
            { role: "Admin", color: "bg-primary/15 text-primary border-primary/30", icon: "🔑", desc: "Full access to all workspaces. Can add/remove members, validate leads, delete records, assign tasks." },
            { role: "OCP", color: "bg-success/15 text-success border-success/30", icon: "⭐", desc: "Full access to one event workspace. Can manage all areas, view pipeline, approve items." },
            { role: "OCVP", color: "bg-accent/15 text-accent border-accent/30", icon: "🔷", desc: "Like OCP but typically focused on a subset of areas. Can manage their assigned areas." },
            { role: "OC", color: "bg-warning/15 text-warning border-warning/30", icon: "👤", desc: "Access restricted to one key area only. Can create tasks and leads; cannot validate or delete." },
            { role: "PM Member", color: "bg-info/15 text-info border-info/30", icon: "📋", desc: "Access to PM & EWA department only. Receives task assignments from admin." },
          ].map((r) => (
            <div key={r.role} className={cn("flex items-start gap-2.5 rounded-xl border p-2.5", r.color)}>
              <span className="text-base">{r.icon}</span>
              <div>
                <div className="text-xs font-bold">{r.role}</div>
                <div className="text-[11px] leading-relaxed mt-0.5">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "ready",
    title: "You're all set!",
    subtitle: "Start exploring Lupara",
    icon: CheckCircle2,
    iconColor: "from-green-500 to-emerald-500",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Here are a few things to get started with right away:
        </p>
        <div className="space-y-2.5">
          {[
            { icon: LayoutDashboard, text: "Check your workspace dashboard for today's KPIs and activity." },
            { icon: TrendingUp, text: "Open the Sales section to track your leads pipeline." },
            { icon: CalendarDays, text: "View the Calendar to see upcoming deadlines and milestones." },
            { icon: Users, text: "Visit the Team page to see your fellow OC members." },
            { icon: Star, text: "Use the ⌘K quick search to jump anywhere instantly." },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border/40 bg-primary/5 p-3">
              <tip.icon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p className="text-xs text-foreground leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/5 p-4 text-center">
          <p className="text-sm font-semibold text-primary">Need help?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Contact your admin or use the AI Assist button in the top bar.
          </p>
        </div>
      </div>
    ),
  },
];

export function OnboardingModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `${STORAGE_KEY}_${user.id}`;
    if (!localStorage.getItem(key)) {
      setVisible(true);
    }
  }, [user]);

  function dismiss() {
    if (user) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, "1");
    }
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const StepIcon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-elegant overflow-hidden">
        {/* Header */}
        <div className="relative border-b border-border/60 px-6 pt-6 pb-5 bg-gradient-to-br from-background to-card">
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", current.iconColor)}>
              <StepIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-tight">{current.title}</div>
              <div className="text-xs text-muted-foreground">{current.subtitle}</div>
            </div>
          </div>

          {/* Step dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted hover:bg-muted-foreground",
                )}
              />
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {step + 1} / {STEPS.length}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-5 scrollbar-thin">
          {current.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-6 py-4">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : dismiss()}
            className="rounded-xl border border-border px-4 py-2 text-sm transition hover:bg-secondary"
          >
            {step === 0 ? "Skip" : "Back"}
          </button>
          <button
            onClick={() => isLast ? dismiss() : setStep(step + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Get started
              </>
            ) : (
              <>
                Next <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
