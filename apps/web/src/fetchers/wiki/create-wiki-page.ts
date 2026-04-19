import { client } from "@kaneo/libs";

type CreateWikiPageInput = {
  projectId: string;
  title: string;
};

async function createWikiPage({ projectId, title }: CreateWikiPageInput) {
  const response = await client.wiki.$post({
    json: { projectId, title },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default createWikiPage;
