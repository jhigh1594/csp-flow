import { useMutation } from "@tanstack/react-query";
import deleteRelease from "@/fetchers/program/delete-release";
import queryClient from "@/query-client";

type DeleteReleaseVariables = {
  workspaceId: string;
  teamId: string;
  releaseId: string;
};

function useDeleteRelease() {
  return useMutation({
    mutationFn: ({ workspaceId, teamId, releaseId }: DeleteReleaseVariables) =>
      deleteRelease({ workspaceId, teamId, releaseId }),
    onSuccess: (_, { teamId, workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["program-team-status", teamId],
      });
      queryClient.invalidateQueries({
        queryKey: ["program-roadmap", workspaceId],
      });
    },
  });
}

export default useDeleteRelease;
