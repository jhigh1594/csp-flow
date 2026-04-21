import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getExternalLinks(taskId: string) {
  const response = await client["external-link"].task[":taskId"].$get({
    param: { taskId },
  });

  return unwrapResponse(response);
}

export default getExternalLinks;
