import { eq } from "drizzle-orm";
import db from "../../database";
import { wikiPageTable } from "../../database/schema";

type UpdateWikiPageInput = {
  id: string;
  title?: string;
  contentHtml?: string;
  contentJson?: Record<string, unknown>;
};

async function updateWikiPage({
  id,
  title,
  contentHtml,
  contentJson,
}: UpdateWikiPageInput) {
  const values: Record<string, unknown> = {};
  if (title !== undefined) values.title = title;
  if (contentHtml !== undefined) values.contentHtml = contentHtml;
  if (contentJson !== undefined) values.contentJson = contentJson;

  const [page] = await db
    .update(wikiPageTable)
    .set(values)
    .where(eq(wikiPageTable.id, id))
    .returning();

  return page;
}

export default updateWikiPage;
