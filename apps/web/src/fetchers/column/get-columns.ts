import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getColumns(projectId: string) {
  const response = await client.column[":projectId"].$get({
    param: { projectId },
  });

  return unwrapResponse(response);
}

export default getColumns;
