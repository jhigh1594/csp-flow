import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function updateTeam({
  teamId,
  name,
  identifier,
}: {
  teamId: string;
  name?: string;
  identifier?: string;
}) {
  const response = await client.teams[":teamId"].$put({
    param: { teamId },
    json: { name, identifier },
  });

  return unwrapResponse(response);
}

export default updateTeam;
