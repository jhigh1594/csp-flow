import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

type BulkOperationType =
  | "updateStatus"
  | "updatePriority"
  | "updateAssignee"
  | "delete"
  | "addLabel"
  | "removeLabel"
  | "updateDueDate";

async function bulkOperation({
  taskIds,
  operation,
  value,
}: {
  taskIds: string[];
  operation: BulkOperationType;
  value?: string | null;
}) {
  const response = await client.task.bulk.$patch({
    json: { taskIds, operation, value },
  });

  return unwrapResponse(response);
}

export default bulkOperation;
