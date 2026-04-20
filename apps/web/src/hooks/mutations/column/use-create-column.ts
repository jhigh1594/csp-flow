import { useMutation, useQueryClient } from "@tanstack/react-query";
import createColumn from "@/fetchers/column/create-column";

export function useCreateColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      data,
    }: {
      teamId: string;
      data: { name: string; icon?: string; color?: string; isFinal?: boolean };
    }) => createColumn(teamId, data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["team-columns", variables.teamId],
        refetchType: "all",
      });
    },
  });
}
