import { client } from "@kaneo/libs";

async function createTeam({
  workspaceId,
  name,
  identifier,
}: {
  workspaceId: string;
  name: string;
  identifier?: string;
}) {
  const response = await client.teams.$post({
    json: { workspaceId, name, identifier },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default createTeam;
