import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getTeamColumns({ teamId }: { teamId: string }) {
  const response = await client.teams[":teamId"].columns.$get({
    param: { teamId },
  });

  return unwrapResponse(response);
}

export default getTeamColumns;
