import { useQuery } from "@tanstack/react-query";
import getTeamProjects from "@/fetchers/team/get-team-projects";

function useGetTeamProjects({ teamId }: { teamId: string }) {
  return useQuery({
    queryKey: ["team-projects", teamId],
    queryFn: () => getTeamProjects({ teamId }),
    enabled: !!teamId,
  });
}

export default useGetTeamProjects;
