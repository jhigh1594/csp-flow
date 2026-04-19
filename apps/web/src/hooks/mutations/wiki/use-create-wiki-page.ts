import { useMutation, useQueryClient } from "@tanstack/react-query";
import createWikiPage from "@/fetchers/wiki/create-wiki-page";

export function useCreateWikiPage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWikiPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
    },
  });
}
