import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { workspaceUserTable } from "../../database/schema";

async function updateMemberRole(id: string, role: string) {
  const [existing] = await db
    .select()
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.id, id));

  if (!existing) {
    throw new HTTPException(404, { message: "Workspace member not found" });
  }

  const [updated] = await db
    .update(workspaceUserTable)
    .set({ role })
    .where(eq(workspaceUserTable.id, id))
    .returning();

  return updated;
}

export default updateMemberRole;
