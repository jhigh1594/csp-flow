import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import queryClient from "@/query-client";

type CreateTeamVariables = {
  workspaceId: string;
  name: string;
};

function useCreateTeam() {
  return useMutation({
    mutationFn: async ({ workspaceId, name }: CreateTeamVariables) => {
      const { data, error } = await authClient.organization.createTeam({
        name,
        organizationId: workspaceId,
      });
      if (error) throw new Error(error.message || "Failed to create team");
      return data;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["teams", workspaceId] });
    },
  });
}

export default useCreateTeam;
