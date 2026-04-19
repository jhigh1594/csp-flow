import { useMutation, useQueryClient } from "@tanstack/react-query";
import lockWikiPage from "@/fetchers/wiki/lock-wiki-page";

export function useLockWikiPage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: lockWikiPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
    },
  });
}
