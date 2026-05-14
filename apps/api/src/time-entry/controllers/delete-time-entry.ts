import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { timeEntryTable } from "../../database/schema";

async function deleteTimeEntry(id: string) {
  const [existing] = await db
    .select()
    .from(timeEntryTable)
    .where(eq(timeEntryTable.id, id));

  if (!existing) {
    throw new HTTPException(404, { message: "Time entry not found" });
  }

  const [deleted] = await db
    .delete(timeEntryTable)
    .where(eq(timeEntryTable.id, id))
    .returning();

  return deleted;
}

export default deleteTimeEntry;
