import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { roadmapReleaseTable } from "../../database/schema";

async function deleteRelease(releaseId: string, teamId: string) {
  const [deleted] = await db
    .delete(roadmapReleaseTable)
    .where(
      and(
        eq(roadmapReleaseTable.id, releaseId),
        eq(roadmapReleaseTable.teamId, teamId),
      ),
    )
    .returning({ id: roadmapReleaseTable.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Release not found" });
  }

  return { success: true };
}

export default deleteRelease;
