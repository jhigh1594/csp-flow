import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { riskTable } from "../../database/schema";

async function updateRisk({
  riskId,
  description,
  impact,
  status,
  owner,
  dueDate,
}: {
  riskId: string;
  description?: string;
  impact?: string;
  status?: string;
  owner?: string | null;
  dueDate?: string | null;
}) {
  const updateValues: Partial<typeof riskTable.$inferInsert> = {};

  if (description !== undefined) {
    updateValues.description = description;
  }
  if (impact !== undefined) {
    updateValues.impact = impact;
  }
  if (status !== undefined) {
    updateValues.status = status;
  }
  if (owner !== undefined) {
    updateValues.owner = owner;
  }
  if (dueDate !== undefined) {
    updateValues.dueDate = dueDate;
  }

  const [risk] = await db
    .update(riskTable)
    .set(updateValues)
    .where(eq(riskTable.id, riskId))
    .returning();

  if (!risk) {
    throw new HTTPException(404, { message: "Risk not found" });
  }

  return risk;
}

export default updateRisk;
