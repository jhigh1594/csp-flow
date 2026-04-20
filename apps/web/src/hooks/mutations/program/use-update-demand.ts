import { useMutation } from "@tanstack/react-query";
import updateDemand from "@/fetchers/program/update-demand";
import queryClient from "@/query-client";

type UpdateDemandVariables = {
  workspaceId: string;
  teamId: string;
  demandId: string;
  name?: string;
  businessPartnershipDate?: string | null;
  discoveryDate?: string | null;
  requirementsDate?: string | null;
  demandSubmissionDate?: string | null;
  developmentDate?: string | null;
  uatDate?: string | null;
  goLiveDate?: string | null;
  adoptionDate?: string | null;
};

function useUpdateDemand() {
  return useMutation({
    mutationFn: (variables: UpdateDemandVariables) => updateDemand(variables),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["program-team-status", teamId] });
    },
  });
}

export default useUpdateDemand;
