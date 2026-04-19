import { asc, isNull } from "drizzle-orm";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

async function getWikiPages(projectId: string) {
  const pages = await db
    .select()
    .from(wikiPageTable)
    .where(isNull(wikiPageTable.archivedAt))
    .orderBy(asc(wikiPageTable.createdAt));

  return pages.filter((page) => page.projectId === projectId);
}

export default getWikiPages;
