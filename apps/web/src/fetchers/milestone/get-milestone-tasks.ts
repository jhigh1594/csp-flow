import { client } from "@kaneo/libs";

async function getMilestoneTasks(milestoneId: string) {
  const response = await client.milestone[":milestoneId"].tasks.$get({
    param: { milestoneId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getMilestoneTasks;
