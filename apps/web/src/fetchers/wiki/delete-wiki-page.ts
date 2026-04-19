import { client } from "@kaneo/libs";

async function deleteWikiPage(id: string) {
  const response = await client.wiki[":id"].$delete({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default deleteWikiPage;
