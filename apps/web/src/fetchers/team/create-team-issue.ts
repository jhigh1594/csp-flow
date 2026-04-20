import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type CreateTeamIssueRequest = InferRequestType<
  (typeof client)["teams"][":teamId"]["issues"]["$post"]
>["json"] &
  InferRequestType<
    (typeof client)["teams"][":teamId"]["issues"]["$post"]
  >["param"];

async function createTeamIssue({
  teamId,
  title,
  description,
  columnId,
  status,
  priority,
  assigneeId,
}: CreateTeamIssueRequest) {
  const response = await client.teams[":teamId"].issues.$post({
    param: { teamId },
    json: { title, description, columnId, status, priority, assigneeId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default createTeamIssue;
