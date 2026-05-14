import { useMutation, useQueryClient } from "@tanstack/react-query";
import unarchiveWikiPage from "@/fetchers/wiki/unarchive-wiki-page";

export function useUnarchiveWikiPage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unarchiveWikiPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
    },
  });
}
