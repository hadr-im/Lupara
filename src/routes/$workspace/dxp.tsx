import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Topbar } from "@/components/app/topbar";
import { cn } from "@/lib/utils";
import { MapPin, Users, ListOrdered, Mail, CalendarDays, MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/$workspace/dxp")({
  component: DXPLayout,
});

const dxpTabs = [
  { id: "physical", label: "Physical Attraction", icon: MapPin, path: "physical" },
  { id: "one2one", label: "1-on-1 Meetings", icon: Users, path: "one2one" },
  { id: "agenda", label: "Agenda Draft", icon: ListOrdered, path: "agenda" },
  { id: "email", label: "Email Templates", icon: Mail, path: "email" },
  { id: "dday", label: "D-Day Dispatch", icon: CalendarDays, path: "dday" },
  { id: "whatsapp", label: "WhatsApp Timeline", icon: MessageSquare, path: "whatsapp" },
];

function DXPLayout() {
  const { workspace } = Route.useParams();
  const { canSeeKeyArea } = useAuth();
  const loc = useLocation();

  if (!canSeeKeyArea(workspace, "dxp")) {
    return (
      <div className="flex flex-col min-h-screen">
        <Topbar title="DXP / Experience" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">You don't have access to this area.</p>
        </div>
      </div>
    );
  }

  const activeTab = dxpTabs.find((t) => loc.pathname.endsWith(`/${t.path}`))?.id ?? "physical";

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="DXP / Experience" />
      <div className="flex flex-col flex-1">
        {/* DXP header */}
        <div className="border-b border-border/60 bg-gradient-to-r from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 px-8 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-xl font-semibold">DXP / Experience</div>
              <div className="text-xs text-muted-foreground">Attendee experience design & event operations</div>
            </div>
          </div>
          {/* Sub-navigation tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-thin">
            {dxpTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <a
                  key={tab.id}
                  href={`/${workspace}/dxp/${tab.path}`}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition whitespace-nowrap",
                    isActive
                      ? "border-border/60 bg-card text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Sub-page content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
