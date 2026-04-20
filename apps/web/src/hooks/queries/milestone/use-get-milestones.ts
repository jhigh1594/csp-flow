import { useQuery } from "@tanstack/react-query";
import getMilestones from "@/fetchers/milestone/get-milestones";

export function useGetMilestones(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () => getMilestones(projectId ?? ""),
    refetchInterval: 30000,
    enabled: !!projectId,
  });
}
