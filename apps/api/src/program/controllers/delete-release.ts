import { eq } from "drizzle-orm";
import db from "../../database";
import { roadmapReleaseTable } from "../../database/schema";

async function deleteRelease(releaseId: string) {
  await db
    .delete(roadmapReleaseTable)
    .where(eq(roadmapReleaseTable.id, releaseId));
  return { success: true };
}

export default deleteRelease;
