import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteMilestone from "@/fetchers/milestone/delete-milestone";

export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
  });
}
