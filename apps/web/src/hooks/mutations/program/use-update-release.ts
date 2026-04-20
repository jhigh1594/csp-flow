import { useMutation } from "@tanstack/react-query";
import updateRelease from "@/fetchers/program/update-release";
import queryClient from "@/query-client";

type UpdateReleaseVariables = {
  workspaceId: string;
  teamId: string;
  releaseId: string;
  name?: string;
  quarter?: "q1" | "q2" | "q3" | "q4";
  month?: number;
  fiscalYear?: number;
  personas?: string[] | null;
  description?: string | null;
};

function useUpdateRelease() {
  return useMutation({
    mutationFn: (variables: UpdateReleaseVariables) => updateRelease(variables),
    onSuccess: (_, { teamId, workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["program-team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["program-roadmap", workspaceId] });
    },
  });
}

export default useUpdateRelease;
