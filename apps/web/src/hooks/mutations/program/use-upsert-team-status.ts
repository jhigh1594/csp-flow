import { useMutation } from "@tanstack/react-query";
import upsertTeamStatus from "@/fetchers/program/upsert-team-status";
import queryClient from "@/query-client";

type UpsertTeamStatusVariables = {
  workspaceId: string;
  teamId: string;
  health: "green" | "amber" | "red";
  accomplishments?: string | null;
  nextWeekFocus?: string | null;
  leadershipAsks?: string | null;
};

function useUpsertTeamStatus() {
  return useMutation({
    mutationFn: ({
      workspaceId,
      teamId,
      health,
      accomplishments,
      nextWeekFocus,
      leadershipAsks,
    }: UpsertTeamStatusVariables) =>
      upsertTeamStatus({ workspaceId, teamId, health, accomplishments, nextWeekFocus, leadershipAsks }),
    onSuccess: (_, { teamId, workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ["program-team-status", teamId] });
      queryClient.invalidateQueries({ queryKey: ["program-teams", workspaceId] });
    },
  });
}

export default useUpsertTeamStatus;
