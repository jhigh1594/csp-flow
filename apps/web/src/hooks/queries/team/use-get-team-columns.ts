import { useQuery } from "@tanstack/react-query";
import getTeamColumns from "@/fetchers/team/get-team-columns";

function useGetTeamColumns({ teamId }: { teamId: string }) {
  return useQuery({
    queryKey: ["team-columns", teamId],
    queryFn: () => getTeamColumns({ teamId }),
    enabled: !!teamId,
  });
}

export default useGetTeamColumns;
