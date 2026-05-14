import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateProject from "@/fetchers/project/update-project";

function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export default useUpdateProject;
