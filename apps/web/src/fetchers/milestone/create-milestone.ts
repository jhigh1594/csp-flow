import { client } from "@kaneo/libs";

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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default createMilestone;
