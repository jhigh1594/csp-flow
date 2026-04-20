import { and, asc, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

async function getWikiPages(projectId: string) {
  try {
    return await db
      .select({
        id: wikiPageTable.id,
        projectId: wikiPageTable.projectId,
        title: wikiPageTable.title,
        isLocked: wikiPageTable.isLocked,
        archivedAt: wikiPageTable.archivedAt,
        createdBy: wikiPageTable.createdBy,
        createdAt: wikiPageTable.createdAt,
        updatedAt: wikiPageTable.updatedAt,
      })
      .from(wikiPageTable)
      .where(
        and(
          eq(wikiPageTable.projectId, projectId),
          isNull(wikiPageTable.archivedAt),
        ),
      )
      .orderBy(asc(wikiPageTable.createdAt));
  } catch (error) {
    console.error("getWikiPages error:", error);
    throw new HTTPException(500, { message: "Failed to fetch wiki pages" });
  }
}

export default getWikiPages;
