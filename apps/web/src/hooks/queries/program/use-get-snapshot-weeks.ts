import { useQuery } from "@tanstack/react-query";
import getSnapshotWeeks from "@/fetchers/program/get-snapshot-weeks";

function useGetSnapshotWeeks({ workspaceId }: { workspaceId: string }) {
  return useQuery({
    queryKey: ["program-snapshot-weeks", workspaceId],
    queryFn: () => getSnapshotWeeks({ workspaceId }),
    enabled: !!workspaceId,
  });
}

export default useGetSnapshotWeeks;
