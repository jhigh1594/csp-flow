import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateTaskRequest = InferRequestType<
  (typeof client)["task"][":projectId"]["$post"]
>["json"] &
  InferRequestType<(typeof client)["task"][":projectId"]["$post"]>["param"];

async function createTask(
  title: string,
  description: string,
  projectId: string,
  userId: string,
  status: string,
  startDate: Date | undefined,
  dueDate: Date | undefined,
  priority: string,
) {
  if (!projectId) {
    throw new Error("No project selected for task creation");
  }

  const response = await client.task[":projectId"].$post({
    json: {
      title,
      description,
      userId,
      status,
      startDate: startDate?.toISOString() || undefined,
      dueDate: dueDate?.toISOString() || undefined,
      priority: priority as
        | "medium"
        | "low"
        | "no-priority"
        | "high"
        | "urgent",
    },
    param: { projectId },
  });

  return unwrapResponse(response);
}

export default createTask;
