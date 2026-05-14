import { useQuery } from "@tanstack/react-query";
import getWikiPage from "@/fetchers/wiki/get-wiki-page";

export function useGetWikiPage(pageId: string) {
  return useQuery({
    queryKey: ["wiki-page", pageId],
    queryFn: () => getWikiPage(pageId),
    enabled: !!pageId,
  });
}
