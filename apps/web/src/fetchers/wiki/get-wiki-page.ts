import { client } from "@kaneo/libs";

async function getWikiPage(id: string) {
  const response = await client.wiki[":id"].$get({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getWikiPage;
