import { client } from "@kaneo/libs";

async function createTeamColumn({
  teamId,
  name,
  isFinal,
}: {
  teamId: string;
  name: string;
  isFinal?: boolean;
}) {
  const response = await client.teams[":teamId"].columns.$post({
    param: { teamId },
    json: { name, isFinal },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default createTeamColumn;
