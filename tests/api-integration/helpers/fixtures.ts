import { randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import db, { schema } from "../../../apps/api/src/database";

const DEFAULT_COLUMNS = [
  { name: "To Do", slug: "to-do", position: 0, isFinal: false },
  { name: "In Progress", slug: "in-progress", position: 1, isFinal: false },
  { name: "In Review", slug: "in-review", position: 2, isFinal: false },
  { name: "Done", slug: "done", position: 3, isFinal: true },
];

export type SeededMemberContext = {
  user: typeof schema.userTable.$inferSelect;
  workspace: typeof schema.workspaceTable.$inferSelect;
  team: typeof schema.teamTable.$inferSelect;
  columns: {
    todo: typeof schema.columnTable.$inferSelect;
    inProgress: typeof schema.columnTable.$inferSelect;
    inReview: typeof schema.columnTable.$inferSelect;
    done: typeof schema.columnTable.$inferSelect;
  };
};

export async function createWorkspaceMember(
  overrides?: Partial<{
    userName: string;
    workspaceName: string;
    role: string;
  }>,
): Promise<SeededMemberContext> {
  const userId = `user-${randomUUID()}`;
  const workspaceId = `workspace-${randomUUID()}`;

  const [user] = await db
    .insert(schema.userTable)
    .values({
      id: userId,
      email: `${userId}@example.com`,
      emailVerified: true,
      name: overrides?.userName || "Integration Test User",
    })
    .returning();

  const [workspace] = await db
    .insert(schema.workspaceTable)
    .values({
      id: workspaceId,
      createdAt: new Date(),
      name: overrides?.workspaceName || "Integration Test Workspace",
      slug: `workspace-${randomUUID()}`,
    })
    .returning();

  await db.insert(schema.workspaceUserTable).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: overrides?.role ?? "member",
    joinedAt: new Date(),
  });

  const now = new Date();
  const [team] = await db
    .insert(schema.teamTable)
    .values({
      id: createId(),
      name: "Engineering",
      identifier: "ENG",
      workspaceId: workspace.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const insertedColumns: (typeof schema.columnTable.$inferSelect)[] = [];
  for (const col of DEFAULT_COLUMNS) {
    const [inserted] = await db
      .insert(schema.columnTable)
      .values({
        id: createId(),
        teamId: team.id,
        name: col.name,
        slug: col.slug,
        position: col.position,
        isFinal: col.isFinal,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (inserted) {
      insertedColumns.push(inserted);
    }
  }

  const columnsBySlug = new Map(
    insertedColumns.map((column) => [column.slug, column]),
  );

  const todo = columnsBySlug.get("to-do");
  const inProgress = columnsBySlug.get("in-progress");
  const inReview = columnsBySlug.get("in-review");
  const done = columnsBySlug.get("done");

  if (!todo || !inProgress || !inReview || !done) {
    throw new Error("Failed to seed default team columns");
  }

  return {
    user,
    workspace,
    team,
    columns: { todo, inProgress, inReview, done },
  };
}

export async function createProjectFixture({
  workspaceId,
  teamId,
  name = "Integration Project",
  icon = "Folder",
  slug = `project-${randomUUID()}`,
}: {
  workspaceId: string;
  teamId: string;
  name?: string;
  icon?: string;
  slug?: string;
}) {
  const [project] = await db
    .insert(schema.projectTable)
    .values({
      workspaceId,
      teamId,
      name,
      icon,
      slug,
    })
    .returning();

  return { project };
}
