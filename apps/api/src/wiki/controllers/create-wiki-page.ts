import db from "../../database";
import { wikiPageTable } from "../../database/schema";

type CreateWikiPageInput = {
  projectId: string;
  title: string;
  userId: string;
};

async function createWikiPage({
  projectId,
  title,
  userId,
}: CreateWikiPageInput) {
  const [page] = await db
    .insert(wikiPageTable)
    .values({ projectId, title, createdBy: userId })
    .returning();

  return page;
}

export default createWikiPage;
