import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

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

  return unwrapResponse(response);
}

export default updateMilestone;
