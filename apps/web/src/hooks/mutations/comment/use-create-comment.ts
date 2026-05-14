import { useMutation, useQueryClient } from "@tanstack/react-query";
import createComment from "@/fetchers/comment/create-comment";

function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["activities", variables.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });
}

export default useCreateComment;
