import { useQuery } from "@tanstack/react-query";
import getTeamIssues from "@/fetchers/team/get-team-issues";

function useGetTeamIssues({
  teamId,
  cursor,
  limit,
}: {
  teamId: string;
  cursor?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["team-issues", teamId, cursor, limit],
    queryFn: () => getTeamIssues({ teamId, cursor, limit }),
    enabled: !!teamId,
  });
}

export default useGetTeamIssues;
