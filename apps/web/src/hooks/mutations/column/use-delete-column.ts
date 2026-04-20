import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteColumn from "@/fetchers/column/delete-column";

export function useDeleteColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; teamId: string }) => deleteColumn(id),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["team-columns", variables.teamId],
        refetchType: "all",
      });
    },
  });
}
