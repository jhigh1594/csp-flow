import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTaskRoadmapGroup from "@/fetchers/task/update-task-roadmap-group";
import type Task from "@/types/task";

export function useUpdateTaskRoadmapGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Task) => updateTaskRoadmapGroup(task.id, task),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
    },
  });
}
