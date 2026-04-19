import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteWikiPage from "@/fetchers/wiki/delete-wiki-page";

export function useDeleteWikiPage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWikiPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
    },
  });
}
