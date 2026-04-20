import db from "../../database";
import { riskTable } from "../../database/schema";

async function createRisk({
  teamId,
  description,
  impact,
  status,
  owner,
  dueDate,
}: {
  teamId: string;
  description: string;
  impact?: string | null;
  status?: string | null;
  owner?: string | null;
  dueDate?: string | null;
}) {
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
