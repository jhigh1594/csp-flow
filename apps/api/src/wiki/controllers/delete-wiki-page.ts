import { eq } from "drizzle-orm";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

async function deleteWikiPage(id: string) {
  const [page] = await db
    .select()
    .from(wikiPageTable)
    .where(eq(wikiPageTable.id, id))
    .limit(1);

  if (!page) {
    throw new Error("Page not found");
  }

  if (!page.archivedAt) {
    throw new Error("Page must be archived before deletion");
  }

  await db.delete(wikiPageTable).where(eq(wikiPageTable.id, id));

  return { success: true };
}

export default deleteWikiPage;
