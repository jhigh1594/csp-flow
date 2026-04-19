import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateMilestone from "@/fetchers/milestone/update-milestone";

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMilestone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
  });
}
