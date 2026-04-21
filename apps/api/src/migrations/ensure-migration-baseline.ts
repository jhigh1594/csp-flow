import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import db from "../database";

const BASELINE_MIGRATIONS = [
  { tag: "0000_small_gamora", when: 1776704501838 },
  { tag: "0001_small_santa_claus", when: 1776720539565 },
  { tag: "0002_cynical_excalibur", when: 1776723922350 },
] as const;

function fileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

/**
 * When upgrading an existing instance whose migration history predates the
 * consolidated baseline (0000/0001/0002), Drizzle would try to re-run those
 * files and fail because the tables already exist. This function detects that
 * case and records the baseline files as applied so Drizzle skips them.
 *
 * On a fresh install the `team` table doesn't exist yet, so we skip and let
 * Drizzle apply the baseline files normally.
 */
export async function ensureMigrationBaseline(migrationsDir: string) {
  const teamTableExists = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'team'
    ) AS exists
  `);

  const isUpgrade =
    teamTableExists.rows[0]?.exists === true ||
    teamTableExists.rows[0]?.exists === "t";

  if (!isUpgrade) {
    return;
  }

  for (const migration of BASELINE_MIGRATIONS) {
    const filePath = `${migrationsDir}/${migration.tag}.sql`;

    let hash: string;
    try {
      hash = fileHash(filePath);
    } catch {
      continue;
    }

    const existing = await db.execute(
      sql`SELECT id FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`,
    );

    if (existing.rows.length === 0) {
      await db.execute(sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${hash}, ${migration.when})
        ON CONFLICT DO NOTHING
      `);
      console.log(`  ✓ Recorded baseline migration: ${migration.tag}`);
    }
  }
}
