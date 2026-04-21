import { useMutation } from "@tanstack/react-query";
import updateRisk from "@/fetchers/program/update-risk";
import queryClient from "@/query-client";

type UpdateRiskVariables = {
  workspaceId: string;
  teamId: string;
  riskId: string;
  description?: string;
  impact?: "high" | "medium" | "low";
  status?: "open" | "mitigated" | "closed";
  owner?: string | null;
  dueDate?: string | null;
};

function useUpdateRisk() {
  return useMutation({
    mutationFn: (variables: UpdateRiskVariables) => updateRisk(variables),
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

export default useUpdateRisk;
