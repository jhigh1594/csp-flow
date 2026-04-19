import { eq } from "drizzle-orm";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

async function archiveWikiPage(id: string) {
  const [page] = await db
    .update(wikiPageTable)
    .set({ archivedAt: new Date() })
    .where(eq(wikiPageTable.id, id))
    .returning();

  return page;
}

async function unarchiveWikiPage(id: string) {
  const [page] = await db
    .update(wikiPageTable)
    .set({ archivedAt: null })
    .where(eq(wikiPageTable.id, id))
    .returning();

  return page;
}

export { archiveWikiPage, unarchiveWikiPage };
