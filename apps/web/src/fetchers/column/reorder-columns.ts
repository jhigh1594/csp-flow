import { client } from "@kaneo/libs";

async function reorderColumns(
  teamId: string,
  columns: Array<{ id: string; position: number }>,
) {
  const response = await client.teams[":teamId"].columns.reorder.$put({
    param: { teamId },
    json: { columns },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default reorderColumns;
