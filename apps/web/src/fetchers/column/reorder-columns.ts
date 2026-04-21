import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function reorderColumns(
  teamId: string,
  columns: Array<{ id: string; position: number }>,
) {
  const response = await client.teams[":teamId"].columns.reorder.$put({
    param: { teamId },
    json: { columns },
  });

  return unwrapResponse(response);
}

export default reorderColumns;
