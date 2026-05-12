"use strict";

/**
 * Run on Railway API container (internal DATABASE_URL):
 *   base64 -w0 < apps/api/scripts/railway-remote-diag.cjs | railway ssh -s csp-flow-api -- sh -c 'base64 -d > /tmp/railway-remote-diag.cjs && node /tmp/railway-remote-diag.cjs'
 */
const { Client } = require("/app/apps/api/node_modules/pg");

const url = process.env.DATABASE_URL;
if (!url) {
  process.stderr.write("DATABASE_URL is not set\n");
  process.exit(1);
}

const useSsl =
  !url.includes("localhost") &&
  !url.includes("127.0.0.1") &&
  !url.includes(".internal");

const client = new Client({
  connectionString: url,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

async function section(title, sql) {
  process.stdout.write(`\n=== ${title} ===\n`);
  const { rows } = await client.query(sql);
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

async function main() {
  await client.connect();

  await section(
    "Session totals",
    `
  SELECT
    COUNT(*)::int AS total_sessions,
    COUNT(*) FILTER (WHERE expires_at < NOW())::int AS expired_sessions,
    COUNT(*) FILTER (WHERE expires_at >= NOW())::int AS active_sessions
  FROM session
`,
  );

  await section(
    "Recent sessions (last 15)",
    `
  SELECT s.id, s.user_id, s.expires_at, s.active_organization_id, s.updated_at
  FROM session s
  ORDER BY s.updated_at DESC NULLS LAST
  LIMIT 15
`,
  );

  await section(
    "Users with no workspace membership (sample 25)",
    `
  SELECT u.id, u.email, u.created_at
  FROM "user" u
  LEFT JOIN workspace_member wm ON wm.user_id = u.id
  WHERE wm.id IS NULL
  ORDER BY u.created_at DESC
  LIMIT 25
`,
  );

  await section(
    "Sessions: active_organization_id set but user not in that workspace (sample)",
    `
  SELECT s.id AS session_id, s.user_id, s.active_organization_id
  FROM session s
  LEFT JOIN workspace_member wm
    ON wm.user_id = s.user_id AND wm.workspace_id = s.active_organization_id
  WHERE s.active_organization_id IS NOT NULL
    AND wm.id IS NULL
  ORDER BY s.updated_at DESC NULLS LAST
  LIMIT 25
`,
  );

  await section(
    "Workspace / member counts",
    `
  SELECT
    (SELECT COUNT(*)::int FROM workspace) AS workspaces,
    (SELECT COUNT(*)::int FROM workspace_member) AS workspace_members,
    (SELECT COUNT(*)::int FROM "user") AS users,
    (SELECT COUNT(*)::int FROM account) AS accounts
`,
  );

  await section(
    "Users with sessions but zero memberships",
    `
  SELECT DISTINCT u.id, u.email
  FROM "user" u
  INNER JOIN session s ON s.user_id = u.id
  LEFT JOIN workspace_member wm ON wm.user_id = u.id
  WHERE wm.id IS NULL
  LIMIT 25
`,
  );

  await client.end();
  process.stdout.write("\nDone (read-only).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
