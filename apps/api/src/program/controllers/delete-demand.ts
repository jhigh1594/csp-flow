import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { demandTable } from "../../database/schema";

async function deleteDemand(demandId: string, teamId: string) {
  const [deleted] = await db
    .delete(demandTable)
    .where(and(eq(demandTable.id, demandId), eq(demandTable.teamId, teamId)))
    .returning({ id: demandTable.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Demand not found" });
  }

  return { success: true };
}

export default deleteDemand;
