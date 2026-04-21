import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function deleteMilestone(id: string) {
  const response = await client.milestone[":id"].$delete({
    param: { id },
  });

  return unwrapResponse(response);
}

export default deleteMilestone;
