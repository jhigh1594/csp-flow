import { useMutation } from "@tanstack/react-query";
import createRisk from "@/fetchers/program/create-risk";
import queryClient from "@/query-client";

type CreateRiskVariables = {
  workspaceId: string;
  teamId: string;
  description: string;
  impact?: "high" | "medium" | "low";
  status?: "open" | "mitigated" | "closed";
  owner?: string | null;
  dueDate?: string | null;
};

function useCreateRisk() {
  return useMutation({
    mutationFn: (variables: CreateRiskVariables) => createRisk(variables),
    onSuccess: (_, { teamId, workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["program-team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["program-teams", workspaceId] });
    },
  });
}

export default useCreateRisk;
