import { useMutation, useQueryClient } from "@tanstack/react-query";
import reorderTeamColumns from "@/fetchers/team/reorder-team-columns";

function useReorderTeamColumns(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columns: Array<{ id: string; position: number }>) =>
      reorderTeamColumns({ teamId, columns }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-columns", teamId] });
    },
  });
}

export default useReorderTeamColumns;
