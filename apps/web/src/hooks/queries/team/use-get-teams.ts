import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

function useGetTeams({ workspaceId }: { workspaceId: string }) {
  return useQuery({
    queryKey: ["teams", workspaceId],
    queryFn: async () => {
      const { data, error } = await authClient.organization.listTeams({
        query: { organizationId: workspaceId },
      });

      if (error) {
        throw new Error(error.message || "Failed to list teams");
      }

      return data;
    },
    enabled: !!workspaceId,
  });
}

export default useGetTeams;
