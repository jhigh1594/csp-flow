import { useMutation } from "@tanstack/react-query";
import deleteTeam from "@/fetchers/team/delete-team";
import queryClient from "@/query-client";

function useDeleteTeam(workspaceId: string) {
  return useMutation({
    mutationFn: ({ teamId }: { teamId: string }) => deleteTeam({ teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", workspaceId] });
    },
  });
}

export default useDeleteTeam;
