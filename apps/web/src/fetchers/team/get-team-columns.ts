import { client } from "@kaneo/libs";

async function getTeamColumns({ teamId }: { teamId: string }) {
  const response = await client.teams[":teamId"].columns.$get({
    param: { teamId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getTeamColumns;
