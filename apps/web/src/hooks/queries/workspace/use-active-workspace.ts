import { useParams } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

function useActiveWorkspace() {
  const { data: activeOrganization, error } =
    authClient.useActiveOrganization();
  const { data: organizations, isPending: isOrganizationsPending } =
    authClient.useListOrganizations();
  const { workspaceId: routeWorkspaceId } = useParams({
    strict: false,
    select: (params) => ({
      workspaceId:
        "workspaceId" in params && typeof params.workspaceId === "string"
          ? params.workspaceId
          : undefined,
    }),
  });

  // When outside a workspace route (e.g. settings), fall back to the last
  // workspace the user visited, stored by the workspace layout on mount.
  const storedWorkspaceId =
    !routeWorkspaceId && !activeOrganization
      ? (sessionStorage.getItem("activeWorkspaceId") ?? undefined)
      : undefined;

  const workspaceId = routeWorkspaceId ?? storedWorkspaceId;

  const workspaceFromRoute = workspaceId
    ? organizations?.find((organization) => organization.id === workspaceId)
    : undefined;
  const workspace = workspaceFromRoute ?? activeOrganization;
  const isLoading =
    (!!workspaceId && isOrganizationsPending && !workspaceFromRoute) ||
    (!workspace && !error);

  return {
    data: workspace,
    error,
    isLoading,
    isError: !!error,
  };
}

export default useActiveWorkspace;
