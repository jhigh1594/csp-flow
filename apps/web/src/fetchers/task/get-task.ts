import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetTaskRequest = InferRequestType<
  (typeof client)["task"][":id"]["$get"]
>["param"];

async function getTask(taskId: string) {
  const response = await client.task[":id"].$get({ param: { id: taskId } });

  return unwrapResponse(response);
}

export default getTask;
