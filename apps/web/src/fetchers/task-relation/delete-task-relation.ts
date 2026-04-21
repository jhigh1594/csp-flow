import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function deleteTaskRelation(id: string) {
  const response = await client["task-relation"][":id"].$delete({
    param: { id },
  });

  return unwrapResponse(response);
}

export default deleteTaskRelation;
