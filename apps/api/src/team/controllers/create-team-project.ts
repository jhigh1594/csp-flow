import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createTeamProject({
  teamId,
  name,
  description,
  slug,
  icon,
}: {
  teamId: string;
  name: string;
  description?: string;
  slug?: string;
  icon?: string;
}) {
  const team = await db.query.teamTable.findFirst({
    where: (t, { eq }) => eq(t.id, teamId),
  });

  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const resolvedSlug = slug || toSlug(name);

  if (!resolvedSlug) {
    throw new HTTPException(400, {
      message: "Project name must contain at least one alphanumeric character",
    });
  }

  const [createdProject] = await db
    .insert(projectTable)
    .values({
      workspaceId: team.workspaceId,
      teamId,
      name,
      icon: icon || "Layout",
      slug: resolvedSlug,
      description: description || null,
    })
    .returning();

  if (!createdProject) {
    throw new HTTPException(500, { message: "Failed to create project" });
  }

  return createdProject;
}

export default createTeamProject;
