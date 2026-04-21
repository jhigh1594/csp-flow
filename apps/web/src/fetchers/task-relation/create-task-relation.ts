import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function createTaskRelation({
  sourceTaskId,
  targetTaskId,
  relationType,
}: {
  sourceTaskId: string;
  targetTaskId: string;
  relationType: "subtask" | "blocks" | "related";
}) {
  const response = await client["task-relation"].$post({
    json: {
      sourceTaskId,
      targetTaskId,
      relationType,
    },
  });

  return unwrapResponse(response);
}

export default createTaskRelation;
