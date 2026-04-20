import { createId } from "@paralleldrive/cuid2";
import db from "../../database";
import { columnTable, teamTable } from "../../database/schema";

const DEFAULT_COLUMNS = [
  { name: "To Do", slug: "to-do", position: 0, isFinal: false },
  { name: "In Progress", slug: "in-progress", position: 1, isFinal: false },
  { name: "In Review", slug: "in-review", position: 2, isFinal: false },
  { name: "Done", slug: "done", position: 3, isFinal: true },
];

function deriveIdentifier(name: string): string {
  const alpha = name.replace(/[^a-zA-Z]/g, "");
  const candidate = alpha.slice(0, 3).toUpperCase();
  return candidate.length >= 2 ? candidate : "TEAM";
}

async function createTeam({
  workspaceId,
  name,
  identifier,
}: {
  workspaceId: string;
  name: string;
  identifier?: string;
}) {
  const now = new Date();
  const teamId = createId();

  const [team] = await db
    .insert(teamTable)
    .values({
      id: teamId,
      name,
      identifier: identifier ?? deriveIdentifier(name),
      workspaceId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  for (const col of DEFAULT_COLUMNS) {
    await db.insert(columnTable).values({
      id: createId(),
      teamId,
      name: col.name,
      slug: col.slug,
      position: col.position,
      isFinal: col.isFinal,
      createdAt: now,
      updatedAt: now,
    });
  }

  return team;
}

export default createTeam;
