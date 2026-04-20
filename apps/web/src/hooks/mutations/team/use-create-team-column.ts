import { useMutation, useQueryClient } from "@tanstack/react-query";
import createTeamColumn from "@/fetchers/team/create-team-column";

function useCreateTeamColumn(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, isFinal }: { name: string; isFinal?: boolean }) =>
      createTeamColumn({ teamId, name, isFinal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-columns", teamId] });
    },
  });
}

export default useCreateTeamColumn;
