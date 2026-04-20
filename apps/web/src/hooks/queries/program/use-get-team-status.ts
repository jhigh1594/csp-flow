import { useQuery } from "@tanstack/react-query";
import getTeamStatus from "@/fetchers/program/get-team-status";

function useGetTeamStatus({
  workspaceId,
  teamId,
}: {
  workspaceId: string;
  teamId: string;
}) {
  return useQuery({
    queryKey: ["program-team-status", teamId],
    queryFn: () => getTeamStatus({ workspaceId, teamId }),
    enabled: !!teamId,
  });
}

export default useGetTeamStatus;
