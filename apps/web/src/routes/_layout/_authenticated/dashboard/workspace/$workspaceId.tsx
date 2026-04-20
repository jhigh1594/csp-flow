import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();

  useEffect(() => {
    sessionStorage.setItem("activeWorkspaceId", workspaceId);
  }, [workspaceId]);

  return <Outlet />;
}
