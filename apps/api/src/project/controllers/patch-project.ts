import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";

type ProjectPatch = {
  name?: string;
  icon?: string;
  slug?: string;
  description?: string;
  isPublic?: boolean;
};

async function patchProject(
  id: string,
  patch: ProjectPatch,
  workspaceId: string,
) {
  const [existing] = await db
    .select()
    .from(projectTable)
    .where(
      and(eq(projectTable.id, id), eq(projectTable.workspaceId, workspaceId)),
    );

  if (!existing) {
    throw new HTTPException(404, {
      message:
        "Project doesn't exist or doesn't belong to the specified workspace",
    });
  }

  const [updated] = await db
    .update(projectTable)
    .set(patch)
    .where(eq(projectTable.id, id))
    .returning();

  return updated;
}

export default patchProject;
