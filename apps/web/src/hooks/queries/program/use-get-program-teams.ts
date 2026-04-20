import { useQuery } from "@tanstack/react-query";
import getProgramTeams from "@/fetchers/program/get-program-teams";

function useGetProgramTeams({ workspaceId }: { workspaceId: string }) {
  return useQuery({
    queryKey: ["program-teams", workspaceId],
    queryFn: () => getProgramTeams({ workspaceId }),
    enabled: !!workspaceId,
  });
}

export default useGetProgramTeams;
