import { eq } from "drizzle-orm";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

async function lockWikiPage(id: string) {
  const [page] = await db
    .update(wikiPageTable)
    .set({ isLocked: true })
    .where(eq(wikiPageTable.id, id))
    .returning();

  return page;
}

async function unlockWikiPage(id: string) {
  const [page] = await db
    .update(wikiPageTable)
    .set({ isLocked: false })
    .where(eq(wikiPageTable.id, id))
    .returning();

  return page;
}

export { lockWikiPage, unlockWikiPage };
