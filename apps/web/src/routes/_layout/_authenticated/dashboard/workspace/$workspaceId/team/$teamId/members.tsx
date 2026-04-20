import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/members",
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Team Members</div>;
}
