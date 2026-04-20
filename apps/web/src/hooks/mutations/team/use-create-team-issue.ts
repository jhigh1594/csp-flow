import { useMutation } from "@tanstack/react-query";
import createTeamIssue from "@/fetchers/team/create-team-issue";
import queryClient from "@/query-client";

type CreateTeamIssueVariables = {
  teamId: string;
  title: string;
  description?: string;
  columnId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
};

function useCreateTeamIssue() {
  return useMutation({
    mutationFn: ({
      teamId,
      title,
      description,
      columnId,
      status,
      priority,
      assigneeId,
    }: CreateTeamIssueVariables) =>
      createTeamIssue({
        teamId,
        title,
        description,
        columnId,
        status,
        priority,
        assigneeId,
      }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ["team-issues", teamId] });
    },
  });
}

export default useCreateTeamIssue;
