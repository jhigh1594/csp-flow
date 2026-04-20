import { and, asc, eq, isNull } from "drizzle-orm";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

async function getWikiPages(projectId: string) {
  return db
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
}

export default getWikiPages;
