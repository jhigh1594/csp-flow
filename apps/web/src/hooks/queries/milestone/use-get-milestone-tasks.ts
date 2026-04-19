import { useQuery } from "@tanstack/react-query";
import getMilestoneTasks from "@/fetchers/milestone/get-milestone-tasks";

export function useGetMilestoneTasks(milestoneId: string) {
  return useQuery({
    queryKey: ["milestone-tasks", milestoneId],
    queryFn: () => getMilestoneTasks(milestoneId),
    enabled: !!milestoneId,
  });
}
