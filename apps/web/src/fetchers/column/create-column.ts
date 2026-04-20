import { client } from "@kaneo/libs";

async function createColumn(
  teamId: string,
  data: { name: string; icon?: string; color?: string; isFinal?: boolean },
) {
  const response = await client.teams[":teamId"].columns.$post({
    param: { teamId },
    json: data,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default createColumn;
