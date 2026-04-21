import { useMutation } from "@tanstack/react-query";
import deleteRisk from "@/fetchers/program/delete-risk";
import queryClient from "@/query-client";

type DeleteRiskVariables = {
  workspaceId: string;
  teamId: string;
  riskId: string;
};

function useDeleteRisk() {
  return useMutation({
    mutationFn: ({ workspaceId, teamId, riskId }: DeleteRiskVariables) =>
      deleteRisk({ workspaceId, teamId, riskId }),
    onSuccess: (_, { teamId, workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["program-team-status", teamId],
      });
      queryClient.invalidateQueries({
        queryKey: ["program-teams", workspaceId],
      });
    },
  });
}

export default useDeleteRisk;
