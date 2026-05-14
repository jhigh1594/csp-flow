import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTeam from "@/fetchers/team/update-team";

type UpdateTeamVariables = {
  teamId: string;
  name?: string;
  identifier?: string;
};

function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, name, identifier }: UpdateTeamVariables) =>
      updateTeam({ teamId, name, identifier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export default useUpdateTeam;
