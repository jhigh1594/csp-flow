import { sql } from "drizzle-orm";
import db from "../database";

async function tableExists(table: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = ${table}
    ) AS exists
  `);
  return result.rows[0]?.exists === true || result.rows[0]?.exists === "t";
}

/**
 * Creates program tracker tables if they don't exist.
 *
 * On upgrade paths, ensureMigrationBaseline marks 0001_small_santa_claus as
 * applied without running it, leaving these tables absent from the DB.
 * Idempotent: no-op if weekly_status already exists.
 */
export async function runProgramTrackerMigration() {
  if (await tableExists("weekly_status")) {
    console.log("✅ Program tracker tables already exist — skipping.");
    return;
  }

  console.log("🔄 Running program tracker schema migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "demand" (
      "id" text PRIMARY KEY NOT NULL,
      "team_id" text NOT NULL,
      "name" text NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "business_partnership_date" date,
      "discovery_date" date,
      "requirements_date" date,
      "demand_submission_date" date,
      "development_date" date,
      "uat_date" date,
      "go_live_date" date,
      "adoption_date" date,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "risk" (
      "id" text PRIMARY KEY NOT NULL,
      "team_id" text NOT NULL,
      "description" text NOT NULL,
      "impact" text DEFAULT 'medium' NOT NULL,
      "status" text DEFAULT 'open' NOT NULL,
      "owner" text,
      "due_date" date,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "roadmap_release" (
      "id" text PRIMARY KEY NOT NULL,
      "team_id" text NOT NULL,
      "name" text NOT NULL,
      "quarter" text NOT NULL,
      "month" integer NOT NULL,
      "fiscal_year" integer NOT NULL,
      "personas" text[],
      "description" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "weekly_status_snapshot" (
      "id" text PRIMARY KEY NOT NULL,
      "team_id" text NOT NULL,
      "workspace_id" text NOT NULL,
      "week_start" date NOT NULL,
      "snapshot" jsonb NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "weekly_status_snapshot_team_week_unique" UNIQUE("team_id","week_start")
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "weekly_status" (
      "id" text PRIMARY KEY NOT NULL,
      "team_id" text NOT NULL,
      "workspace_id" text NOT NULL,
      "week_start" date NOT NULL,
      "health" text DEFAULT 'green' NOT NULL,
      "accomplishments" text,
      "next_week_focus" text,
      "leadership_asks" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "weekly_status_team_week_unique" UNIQUE("team_id","week_start")
    )
  `);

  await db.execute(sql`
    ALTER TABLE "demand"
    ADD CONSTRAINT "demand_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE "risk"
    ADD CONSTRAINT "risk_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE "roadmap_release"
    ADD CONSTRAINT "roadmap_release_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE "weekly_status_snapshot"
    ADD CONSTRAINT "weekly_status_snapshot_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE "weekly_status_snapshot"
    ADD CONSTRAINT "weekly_status_snapshot_workspace_id_workspace_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE "weekly_status"
    ADD CONSTRAINT "weekly_status_team_id_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);

  await db.execute(sql`
    ALTER TABLE "weekly_status"
    ADD CONSTRAINT "weekly_status_workspace_id_workspace_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
  `);

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "demand_teamId_idx" ON "demand" ("team_id")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "demand_sortOrder_idx" ON "demand" ("team_id","sort_order")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "risk_teamId_idx" ON "risk" ("team_id")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "risk_status_idx" ON "risk" ("team_id","status")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "roadmap_release_teamId_idx" ON "roadmap_release" ("team_id")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "roadmap_release_quarter_idx" ON "roadmap_release" ("team_id","quarter")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "weekly_status_snapshot_teamId_idx" ON "weekly_status_snapshot" ("team_id")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "weekly_status_snapshot_workspaceId_idx" ON "weekly_status_snapshot" ("workspace_id")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "weekly_status_teamId_idx" ON "weekly_status" ("team_id")`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "weekly_status_workspaceId_idx" ON "weekly_status" ("workspace_id")`,
  );

  console.log("✅ Program tracker migration complete!");
}
