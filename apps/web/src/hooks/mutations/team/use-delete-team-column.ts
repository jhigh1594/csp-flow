import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteColumn from "@/fetchers/column/delete-column";

function useDeleteTeamColumn(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteColumn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-columns", teamId] });
    },
  });
}

export default useDeleteTeamColumn;
