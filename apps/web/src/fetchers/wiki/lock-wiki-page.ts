import { client } from "@kaneo/libs";

async function lockWikiPage(id: string) {
  const response = await client.wiki[":id"].lock.$post({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default lockWikiPage;
