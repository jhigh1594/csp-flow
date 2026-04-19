import { client } from "@kaneo/libs";

type UpdateWikiPageInput = {
  id: string;
  title?: string;
  contentHtml?: string;
  contentJson?: unknown;
};

async function updateWikiPage({
  id,
  title,
  contentHtml,
  contentJson,
}: UpdateWikiPageInput) {
  const response = await client.wiki[":id"].$patch({
    param: { id },
    json: { title, contentHtml, contentJson },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default updateWikiPage;
