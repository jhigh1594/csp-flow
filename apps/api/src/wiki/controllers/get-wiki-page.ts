import { eq } from "drizzle-orm";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

async function getWikiPage(id: string) {
  const [page] = await db
    .select()
    .from(wikiPageTable)
    .where(eq(wikiPageTable.id, id))
    .limit(1);

  return page;
}

export default getWikiPage;
