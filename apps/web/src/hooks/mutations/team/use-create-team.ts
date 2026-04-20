import { useMutation } from "@tanstack/react-query";
import createTeam from "@/fetchers/team/create-team";
import queryClient from "@/query-client";

type CreateTeamVariables = {
  workspaceId: string;
  name: string;
};

function useCreateTeam() {
  return useMutation({
    mutationFn: ({ workspaceId, name }: CreateTeamVariables) =>
      createTeam({ workspaceId, name }),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["teams", workspaceId] });
    },
  });
}

export default useCreateTeam;
