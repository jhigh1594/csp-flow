import { useQuery } from "@tanstack/react-query";
import getRoadmap from "@/fetchers/program/get-roadmap";

function useGetRoadmap({ workspaceId }: { workspaceId: string }) {
  return useQuery({
    queryKey: ["program-roadmap", workspaceId],
    queryFn: () => getRoadmap({ workspaceId }),
    enabled: !!workspaceId,
  });
}

export default useGetRoadmap;
