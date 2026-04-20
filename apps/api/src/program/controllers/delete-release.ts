import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { roadmapReleaseTable } from "../../database/schema";

async function deleteRelease(releaseId: string) {
  const [deleted] = await db
    .delete(roadmapReleaseTable)
    .where(eq(roadmapReleaseTable.id, releaseId))
    .returning({ id: roadmapReleaseTable.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Release not found" });
  }

  return { success: true };
}

export default deleteRelease;
