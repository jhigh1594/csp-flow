import { useMutation, useQueryClient } from "@tanstack/react-query";
import reorderColumns from "@/fetchers/column/reorder-columns";

export function useReorderColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      columns,
    }: {
      teamId: string;
      columns: Array<{ id: string; position: number }>;
    }) => reorderColumns(teamId, columns),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["team-columns", variables.teamId],
        refetchType: "all",
      });
    },
  });
}
