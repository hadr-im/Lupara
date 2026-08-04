import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const dest = user.role === "admin" ? "pmewa" : (user.workspaceId ?? "pmewa");
    navigate({ to: "/$workspace", params: { workspace: dest }, replace: true });
  }, [user, navigate]);

  return null;
}
