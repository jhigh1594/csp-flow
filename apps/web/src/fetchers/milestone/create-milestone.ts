import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

type CreateMilestoneInput = {
  projectId: string;
  title: string;
  targetDate: string;
};

async function createMilestone({
  projectId,
  title,
  targetDate,
}: CreateMilestoneInput) {
  const response = await client.milestone.$post({
    json: { projectId, title, targetDate },
  });

  return unwrapResponse(response);
}

export default createMilestone;
