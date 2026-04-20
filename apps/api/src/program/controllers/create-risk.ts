import db from "../../database";
import { riskTable } from "../../database/schema";
import { requireTeamInWorkspace } from "../utils/ownership";

async function createRisk({
  teamId,
  workspaceId,
  description,
  impact,
  status,
  owner,
  dueDate,
}: {
  teamId: string;
  workspaceId: string;
  description: string;
  impact?: string | null;
  status?: string | null;
  owner?: string | null;
  dueDate?: string | null;
}) {
  await requireTeamInWorkspace(teamId, workspaceId);

  const [risk] = await db
    .insert(riskTable)
    .values({
      teamId,
      description,
      impact: impact ?? "medium",
      status: status ?? "open",
      owner: owner ?? null,
      dueDate: dueDate ?? null,
    })
    .returning();

  return risk;
}

export default createRisk;
