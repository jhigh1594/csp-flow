import { sql } from "drizzle-orm";
import db from "../database";

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${table}
    AND column_name = ${column}
  `);
  return result.rows.length > 0;
}

/**
 * Migrates a pre-team-centric schema to the team-centric model:
 *
 *   team      — adds identifier column + unique constraint
 *   project   — adds team_id (assigned to first team in workspace)
 *   task      — adds team_id, makes project_id nullable, swaps unique constraint,
 *               adds roadmap_group
 *   column    — swaps project_id → team_id, deduplicates per team
 *
 * Idempotent: exits immediately if project.team_id already exists.
 */
export async function runTeamCentricMigration() {
  if (await columnExists("project", "team_id")) {
    console.log("✅ Team-centric migration already applied — skipping.");
    return;
  }

  console.log("🔄 Running team-centric schema migration...");

  // 1. team.identifier
  if (!(await columnExists("team", "identifier"))) {
    await db.execute(sql`ALTER TABLE "team" ADD COLUMN "identifier" text`);
    await db.execute(sql`
      UPDATE "team"
      SET "identifier" = CASE
        WHEN LENGTH(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g')) >= 2
          THEN UPPER(SUBSTRING(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'), 1, 3))
        ELSE 'TEAM'
      END
    `);
    // Resolve any duplicate identifiers within the same workspace by appending a counter
    await db.execute(sql`
      WITH ranked AS (
        SELECT id, identifier, workspace_id,
               ROW_NUMBER() OVER (PARTITION BY workspace_id, identifier ORDER BY created_at ASC) AS rn
        FROM "team"
      )
      UPDATE "team" t
      SET identifier = ranked.identifier || ranked.rn::text
      FROM ranked
      WHERE t.id = ranked.id AND ranked.rn > 1
    `);
    await db.execute(
      sql`ALTER TABLE "team" ALTER COLUMN "identifier" SET NOT NULL`,
    );
    await db.execute(sql`
      ALTER TABLE "team"
      ADD CONSTRAINT "team_workspace_identifier_unique"
      UNIQUE ("workspace_id", "identifier")
    `);
    console.log("  ✓ team.identifier");
  }

  // 2. project.team_id — assign to the earliest team in the workspace
  await db.execute(
    sql`ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "team_id" text`,
  );
  await db.execute(sql`
    UPDATE "project" p
    SET "team_id" = (
      SELECT t.id FROM "team" t
      WHERE t.workspace_id = p.workspace_id
      ORDER BY t.created_at ASC, t.id ASC
      LIMIT 1
    )
    WHERE "team_id" IS NULL
  `);
  await db.execute(
    sql`ALTER TABLE "project" ALTER COLUMN "team_id" SET NOT NULL`,
  );
  await db.execute(sql`
    ALTER TABLE "project"
    ADD CONSTRAINT "project_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "project_teamId_idx" ON "project" ("team_id")`,
  );
  console.log("  ✓ project.team_id");

  // 3. task.team_id + roadmap_group
  await db.execute(
    sql`ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "team_id" text`,
  );
  await db.execute(sql`
    UPDATE "task" t
    SET "team_id" = (
      SELECT p.team_id FROM "project" p WHERE p.id = t.project_id
    )
    WHERE "team_id" IS NULL
  `);
  // Remove tasks that can't be mapped (orphaned rows)
  await db.execute(sql`DELETE FROM "task" WHERE "team_id" IS NULL`);
  await db.execute(sql`ALTER TABLE "task" ALTER COLUMN "team_id" SET NOT NULL`);
  await db.execute(
    sql`ALTER TABLE "task" ALTER COLUMN "project_id" DROP NOT NULL`,
  );
  await db.execute(
    sql`ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_project_number_unique"`,
  );
  await db.execute(sql`
    ALTER TABLE "task"
    ADD CONSTRAINT "task_team_number_unique" UNIQUE ("team_id", "number")
  `);
  await db.execute(sql`
    ALTER TABLE "task"
    ADD CONSTRAINT "task_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "task_teamId_idx" ON "task" ("team_id")`,
  );
  if (!(await columnExists("task", "roadmap_group"))) {
    await db.execute(
      sql`ALTER TABLE "task" ADD COLUMN "roadmap_group" text DEFAULT 'later'`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "task_roadmapGroup_idx" ON "task" ("roadmap_group")`,
    );
  }
  console.log("  ✓ task.team_id + roadmap_group");

  // 4. column: project_id → team_id
  await db.execute(
    sql`ALTER TABLE "column" ADD COLUMN IF NOT EXISTS "team_id" text`,
  );
  await db.execute(sql`
    UPDATE "column" c
    SET "team_id" = (
      SELECT p.team_id FROM "project" p WHERE p.id = c.project_id
    )
    WHERE "team_id" IS NULL
  `);
  // Drop orphaned columns
  await db.execute(sql`DELETE FROM "column" WHERE "team_id" IS NULL`);
  // Deduplicate (team_id, slug) — keep the row with the lowest position
  await db.execute(sql`
    DELETE FROM "column"
    WHERE id NOT IN (
      SELECT DISTINCT ON ("team_id", "slug") id
      FROM "column"
      ORDER BY "team_id", "slug", "position" ASC
    )
  `);
  await db.execute(
    sql`ALTER TABLE "column" ALTER COLUMN "team_id" SET NOT NULL`,
  );
  await db.execute(
    sql`ALTER TABLE "column" DROP CONSTRAINT IF EXISTS "column_project_id_project_id_fk"`,
  );
  await db.execute(sql`DROP INDEX IF EXISTS "column_projectId_idx"`);
  await db.execute(
    sql`ALTER TABLE "column" DROP COLUMN IF EXISTS "project_id"`,
  );
  await db.execute(sql`
    ALTER TABLE "column"
    ADD CONSTRAINT "column_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "column_teamId_idx" ON "column" ("team_id")`,
  );
  await db.execute(sql`
    ALTER TABLE "column"
    ADD CONSTRAINT "column_team_slug_unique" UNIQUE ("team_id", "slug")
  `);
  console.log("  ✓ column project_id → team_id");

  console.log("✅ Team-centric migration complete!");
}
