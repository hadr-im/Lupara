import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/dxp/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$workspace/dxp/physical", params, replace: true });
  },
  component: () => null,
});
