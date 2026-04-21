import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function createColumn(
  teamId: string,
  data: { name: string; icon?: string; color?: string; isFinal?: boolean },
) {
  const response = await client.teams[":teamId"].columns.$post({
    param: { teamId },
    json: data,
  });

  return unwrapResponse(response);
}

export default createColumn;
