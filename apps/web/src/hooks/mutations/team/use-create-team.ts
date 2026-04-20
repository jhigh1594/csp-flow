import { useMutation } from "@tanstack/react-query";
import createTeam from "@/fetchers/team/create-team";
import queryClient from "@/query-client";

type CreateTeamVariables = {
  workspaceId: string;
  name: string;
  identifier?: string;
};

function useCreateTeam() {
  return useMutation({
    mutationFn: ({ workspaceId, name, identifier }: CreateTeamVariables) =>
      createTeam({ workspaceId, name, identifier }),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["teams", workspaceId] });
    },
  });
}

export default useCreateTeam;
