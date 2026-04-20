import { useMutation } from "@tanstack/react-query";
import createDemand from "@/fetchers/program/create-demand";
import queryClient from "@/query-client";

type CreateDemandVariables = {
  workspaceId: string;
  teamId: string;
  name: string;
  businessPartnershipDate?: string | null;
  discoveryDate?: string | null;
  requirementsDate?: string | null;
  demandSubmissionDate?: string | null;
  developmentDate?: string | null;
  uatDate?: string | null;
  goLiveDate?: string | null;
  adoptionDate?: string | null;
};

function useCreateDemand() {
  return useMutation({
    mutationFn: (variables: CreateDemandVariables) => createDemand(variables),
    onSuccess: (_, { teamId, workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["program-team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["program-teams", workspaceId] });
    },
  });
}

export default useCreateDemand;
