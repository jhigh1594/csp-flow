import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type DeleteTaskRequest = InferRequestType<
  (typeof client)["task"][":id"]["$delete"]
>["param"];

async function deleteTask(taskId: string) {
  const response = await client.task[":id"].$delete({ param: { id: taskId } });

  return unwrapResponse(response);
}

export default deleteTask;
