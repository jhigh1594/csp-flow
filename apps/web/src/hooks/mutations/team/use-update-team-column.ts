import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateColumn from "@/fetchers/column/update-column";

function useUpdateTeamColumn(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; isFinal?: boolean };
    }) => updateColumn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-columns", teamId] });
    },
  });
}

export default useUpdateTeamColumn;
