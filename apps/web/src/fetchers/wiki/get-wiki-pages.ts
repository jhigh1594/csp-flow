import { client } from "@kaneo/libs";

async function getWikiPages(projectId: string) {
  const response = await client.wiki.project[":projectId"].$get({
    param: { projectId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getWikiPages;
