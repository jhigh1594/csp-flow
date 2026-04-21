import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

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

  return unwrapResponse(response);
}

export default createTeam;
