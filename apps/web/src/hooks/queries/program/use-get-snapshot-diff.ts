import { useQuery } from "@tanstack/react-query";
import getSnapshotDiff from "@/fetchers/program/get-snapshot-diff";

function useGetSnapshotDiff({
  workspaceId,
  fromWeek,
  toWeek,
}: {
  workspaceId: string;
  fromWeek: string;
  toWeek: string;
}) {
  return useQuery({
    queryKey: ["program-snapshot-diff", workspaceId, fromWeek, toWeek],
    queryFn: () => getSnapshotDiff({ workspaceId, from: fromWeek, to: toWeek }),
    enabled: !!fromWeek && !!toWeek,
  });
}

export default useGetSnapshotDiff;
