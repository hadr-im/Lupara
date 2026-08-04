import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "@/components/app/shell";

export const Route = createFileRoute("/$workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { workspace } = Route.useParams();

  useEffect(() => {
    document.documentElement.setAttribute("data-workspace", workspace);
    return () => {
      document.documentElement.removeAttribute("data-workspace");
    };
  }, [workspace]);

  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
