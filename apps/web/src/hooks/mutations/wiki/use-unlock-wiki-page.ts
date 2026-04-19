import { useMutation, useQueryClient } from "@tanstack/react-query";
import unlockWikiPage from "@/fetchers/wiki/unlock-wiki-page";

export function useUnlockWikiPage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlockWikiPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
      queryClient.invalidateQueries({ queryKey: ["wiki-page"] });
    },
  });
}
