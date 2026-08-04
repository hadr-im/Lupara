import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/app/topbar";
import { workspaces } from "@/lib/mock/data";
import { useAuth, roleLabel } from "@/lib/auth-context";
import { Avatar } from "@/components/app/avatar";
import { Settings, User, Bell, Lock, Palette, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$workspace/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { workspace } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const wsData = workspaces.find((w) => w.id === workspace);
  const wsName = wsData?.name ?? workspace;

  const [profileForm, setProfileForm] = useState({ name: user?.name ?? "", email: user?.email ?? "" });
  const [notifForm, setNotifForm] = useState({ leadValidated: true, newLead: true, taskUpdated: false, weeklyDigest: true });
  const [themeForm, setThemeForm] = useState({ accentColor: "#7c3aed", compactMode: false });

  const settingsSections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    ...(isAdmin ? [{ id: "workspace", label: "Workspace", icon: Settings }] : []),
    { id: "about", label: "About", icon: Info },
  ];

  const [activeSection, setActiveSection] = useState("profile");

  return (
    <>
      <Topbar
        breadcrumb={[{ label: wsName }, { label: "Settings" }]}
        title="Settings"
        subtitle="Manage your account and workspace preferences"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Settings nav */}
        <div className="w-48 shrink-0 border-r border-border/60 pt-4 px-2">
          {settingsSections.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={cn("w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition mb-0.5",
                  activeSection === s.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground")}>
                <Icon className="h-4 w-4" />{s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 max-w-2xl">
          {activeSection === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold mb-1">Profile</h2>
                <p className="text-xs text-muted-foreground">Your personal account information.</p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card">
                <Avatar name={user?.name ?? "U"} hue={user?.hue ?? 220} size={56} />
                <div>
                  <div className="font-semibold">{user?.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{roleLabel(user?.role ?? "oc")} · {wsName}</div>
                </div>
              </div>
              <div className="space-y-3">
                {[["name", "Display Name", "text"], ["email", "Email", "email"]].map(([k, l, t]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{l}</label>
                    <input type={t} value={(profileForm as any)[k]} onChange={(e) => setProfileForm({ ...profileForm, [k]: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                ))}
              </div>
              <button onClick={() => toast.success("Profile saved")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Save className="h-4 w-4" /> Save changes
              </button>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold mb-1">Notifications</h2>
                <p className="text-xs text-muted-foreground">Control what alerts you receive.</p>
              </div>
              <div className="space-y-3">
                {[
                  ["leadValidated", "Lead validated", "Receive a notification when your submitted lead gets admin approval."],
                  ["newLead", "New lead pending", "Notify when a new lead requires admin validation (admin only)."],
                  ["taskUpdated", "Task status changed", "Receive alerts when a task in your area changes status."],
                  ["weeklyDigest", "Weekly digest", "Get a weekly summary of workspace activity every Monday."],
                ].map(([key, label, desc]) => (
                  <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-4">
                    <div>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                    <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" checked={(notifForm as any)[key]} onChange={(e) => setNotifForm({ ...notifForm, [key]: e.target.checked })} />
                      <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                      <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                    </label>
                  </div>
                ))}
              </div>
              <button onClick={() => toast.success("Notification settings saved")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold mb-1">Appearance</h2>
                <p className="text-xs text-muted-foreground">Customize the look of your workspace.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Accent Color</label>
                  <div className="flex items-center gap-3">
                    {["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777"].map((c) => (
                      <button key={c} onClick={() => setThemeForm({ ...themeForm, accentColor: c })}
                        className={cn("h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition", themeForm.accentColor === c && "ring-2 ring-primary")}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4">
                  <div>
                    <div className="text-sm font-medium">Compact mode</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Reduce spacing for denser information display.</div>
                  </div>
                  <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={themeForm.compactMode} onChange={(e) => setThemeForm({ ...themeForm, compactMode: e.target.checked })} />
                    <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                  </label>
                </div>
              </div>
              <button onClick={() => toast.success("Appearance saved")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Save className="h-4 w-4" /> Apply
              </button>
            </div>
          )}

          {activeSection === "workspace" && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold mb-1">Workspace Settings</h2>
                <p className="text-xs text-muted-foreground">Admin-only workspace configuration.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
                {workspaces.map((w) => (
                  <div key={w.id} className="flex items-center gap-4 p-4">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br font-display text-xs font-bold text-white", w.color)}>{w.short}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.type === "event" ? "Event Space" : "Department"} · {w.progress}% progress</div>
                    </div>
                    {w.eventDate && <div className="text-xs text-muted-foreground">{new Date(w.eventDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "about" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold mb-1">About Nucleus</h2>
                <p className="text-xs text-muted-foreground">Platform information.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--gradient-primary)]">
                  <span className="font-display text-2xl font-bold text-primary-foreground">N</span>
                </div>
                <div>
                  <div className="font-display text-xl font-semibold">Nucleus</div>
                  <div className="text-xs text-muted-foreground">Operations OS for AIESEC event management</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[["Version", "1.0.0"], ["Build", "2025.06"], ["License", "Internal"], ["Support", "admin@nucleus.app"]].map(([l, v]) => (
                    <div key={l} className="rounded-xl border border-border/40 bg-background/60 px-3 py-2">
                      <div className="text-muted-foreground">{l}</div>
                      <div className="font-medium mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
