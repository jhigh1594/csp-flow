import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { riskTable } from "../../database/schema";

async function deleteRisk(riskId: string, teamId: string) {
  const [deleted] = await db
    .delete(riskTable)
    .where(and(eq(riskTable.id, riskId), eq(riskTable.teamId, teamId)))
    .returning({ id: riskTable.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Risk not found" });
  }

  return { success: true };
}

export default deleteRisk;
