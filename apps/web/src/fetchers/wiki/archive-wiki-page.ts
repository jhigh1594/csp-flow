import { client } from "@kaneo/libs";

async function archiveWikiPage(id: string) {
  const response = await client.wiki[":id"].archive.$post({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default archiveWikiPage;
