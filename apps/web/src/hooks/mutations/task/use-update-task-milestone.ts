import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTaskMilestone from "@/fetchers/task/update-task-milestone";

export function useUpdateTaskMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      milestoneId,
    }: {
      taskId: string;
      milestoneId: string | null;
      projectId: string;
    }) => updateTaskMilestone(taskId, milestoneId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task", variables.taskId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["milestones", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["milestone-tasks"],
      });
    },
  });
}
