import { useMutation, useQueryClient } from "@tanstack/react-query";
import createMilestone from "@/fetchers/milestone/create-milestone";

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMilestone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
  });
}
