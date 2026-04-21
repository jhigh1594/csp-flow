import { useMutation } from "@tanstack/react-query";
import createRelease from "@/fetchers/program/create-release";
import queryClient from "@/query-client";

type CreateReleaseVariables = {
  workspaceId: string;
  teamId: string;
  name: string;
  quarter: "q1" | "q2" | "q3" | "q4";
  month: number;
  fiscalYear: number;
  personas?: string[] | null;
  description?: string | null;
};

function useCreateRelease() {
  return useMutation({
    mutationFn: (variables: CreateReleaseVariables) => createRelease(variables),
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

export default useCreateRelease;
