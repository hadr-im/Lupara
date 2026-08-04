import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route — redirect to workspace-scoped sales
export const Route = createFileRoute("/sales")({
  beforeLoad: () => {
    throw redirect({
      to: "/$workspace/sales",
      params: { workspace: "tedx" },
      replace: true,
    });
  },
  component: () => null,
});
