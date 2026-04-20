import { useMutation } from "@tanstack/react-query";
import createTeamProject from "@/fetchers/team/create-team-project";
import queryClient from "@/query-client";

type CreateTeamProjectVariables = {
  teamId: string;
  name: string;
  description?: string;
  slug?: string;
  icon?: string;
};

function useCreateTeamProject() {
  return useMutation({
    mutationFn: ({
      teamId,
      name,
      description,
      slug,
      icon,
    }: CreateTeamProjectVariables) =>
      createTeamProject({ teamId, name, description, slug, icon }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["team-projects", teamId] });
    },
  });
}

export default useCreateTeamProject;
