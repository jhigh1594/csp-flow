import { client } from "@kaneo/libs";

type UpdateMilestoneInput = {
  id: string;
  title?: string;
  targetDate?: string;
};

async function updateMilestone({
  id,
  title,
  targetDate,
}: UpdateMilestoneInput) {
  const response = await client.milestone[":id"].$put({
    param: { id },
    json: { title, targetDate },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default updateMilestone;
