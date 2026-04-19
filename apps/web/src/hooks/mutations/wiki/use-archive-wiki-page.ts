import { useMutation, useQueryClient } from "@tanstack/react-query";
import archiveWikiPage from "@/fetchers/wiki/archive-wiki-page";

export function useArchiveWikiPage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveWikiPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
    },
  });
}
