import db from "../../database";
import { projectTable } from "../../database/schema";

async function createProject(
  workspaceId: string,
  name: string,
  icon: string,
  slug: string,
  teamId: string,
) {
  const [createdProject] = await db
    .insert(projectTable)
    .values({
      workspaceId,
      teamId,
      name,
      icon,
      slug,
    })
    .returning();

  return createdProject;
}

export default createProject;
