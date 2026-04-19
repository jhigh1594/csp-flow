import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateWikiPage from "@/fetchers/wiki/update-wiki-page";

export function useUpdateWikiPage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWikiPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
    },
  });
}
