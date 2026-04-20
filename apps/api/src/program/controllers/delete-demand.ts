import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { demandTable } from "../../database/schema";

async function deleteDemand(demandId: string) {
  const [deleted] = await db
    .delete(demandTable)
    .where(eq(demandTable.id, demandId))
    .returning({ id: demandTable.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Demand not found" });
  }

  return { success: true };
}

export default deleteDemand;
