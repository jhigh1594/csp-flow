import { useMutation } from "@tanstack/react-query";
import deleteDemand from "@/fetchers/program/delete-demand";
import queryClient from "@/query-client";

type DeleteDemandVariables = {
  workspaceId: string;
  teamId: string;
  demandId: string;
};

function useDeleteDemand() {
  return useMutation({
    mutationFn: ({ workspaceId, teamId, demandId }: DeleteDemandVariables) =>
      deleteDemand({ workspaceId, teamId, demandId }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["program-team-status", teamId] });
    },
  });
}

export default useDeleteDemand;
