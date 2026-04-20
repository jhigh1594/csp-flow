import { useMutation } from "@tanstack/react-query";
import createProject from "@/fetchers/project/create-project";

function useCreateProject({
  name,
  slug,
  workspaceId,
  teamId,
  icon,
}: {
  name: string;
  slug: string;
  workspaceId: string;
  teamId: string;
  icon: string;
}) {
  return useMutation({
    mutationFn: () => createProject({ name, slug, workspaceId, teamId, icon }),
  });
}

export default useCreateProject;
