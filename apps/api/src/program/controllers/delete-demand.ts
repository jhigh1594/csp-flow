import { eq } from "drizzle-orm";
import db from "../../database";
import { demandTable } from "../../database/schema";

async function deleteDemand(demandId: string) {
  await db.delete(demandTable).where(eq(demandTable.id, demandId));
  return { success: true };
}

export default deleteDemand;
