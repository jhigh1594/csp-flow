import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyTaskPatch } from "@/lib/optimistic-task-update";
import { toast } from "@/lib/toast";
import useProjectStore from "@/store/project";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

type Snapshot = {
  previousTask: Task | undefined;
  previousTasks: ProjectWithTasks | undefined;
  previousProject: ProjectWithTasks | undefined;
};

export function useTaskFieldMutation(
  mutationFn: (task: Task) => Promise<unknown>,
  getPatch: (task: Task) => Partial<Task>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onMutate: async (task: Task) => {
      await queryClient.cancelQueries({ queryKey: ["task", task.id] });
      if (task.projectId) {
        await queryClient.cancelQueries({
          queryKey: ["tasks", task.projectId],
        });
      }

      const previousTask = queryClient.getQueryData<Task>(["task", task.id]);
      const previousTasks = task.projectId
        ? queryClient.getQueryData<ProjectWithTasks>(["tasks", task.projectId])
        : undefined;
      const previousProject = useProjectStore.getState().project;

      const patch = getPatch(task);

      queryClient.setQueryData<Task>(["task", task.id], (old) =>
        old ? { ...old, ...patch } : old,
      );

      if (task.projectId && previousTasks) {
        queryClient.setQueryData<ProjectWithTasks>(
          ["tasks", task.projectId],
          (old) => applyTaskPatch(old, task.id, patch),
        );
      }

      if (previousProject) {
        useProjectStore
          .getState()
          .setProject(applyTaskPatch(previousProject, task.id, patch));
      }

      return {
        previousTask,
        previousTasks,
        previousProject,
      } satisfies Snapshot;
    },

    onError: (error, task, onMutateResult) => {
      if (onMutateResult?.previousTask !== undefined) {
        queryClient.setQueryData(
          ["task", task.id],
          onMutateResult.previousTask,
        );
      }
      if (task.projectId && onMutateResult?.previousTasks !== undefined) {
        queryClient.setQueryData(
          ["tasks", task.projectId],
          onMutateResult.previousTasks,
        );
      }
      if (onMutateResult?.previousProject !== undefined) {
        useProjectStore.getState().setProject(onMutateResult.previousProject);
      }
      toast.error(error instanceof Error ? error.message : "Failed to update");
    },

    onSettled: (_data, _error, task) => {
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      if (task.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", task.projectId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activities", task.id] });
      queryClient.invalidateQueries({ queryKey: ["task-relations"] });
      queryClient.invalidateQueries({ queryKey: ["milestone-tasks"] });
    },
  });
}
