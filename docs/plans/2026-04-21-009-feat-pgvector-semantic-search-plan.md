---
title: "feat: Add pgvector semantic search for tasks"
type: feat
status: active
date: 2026-04-21
---

# feat: Add pgvector semantic search for tasks

## Overview

Add semantic search to CSP Flow by integrating pgvector into the existing PostgreSQL database. Task titles and descriptions are embedded using OpenAI `text-embedding-3-small` at 512 dimensions. A new `/api/search/semantic` endpoint returns semantically ranked task results for a natural-language query. Embedding generation is fire-and-forget async on task write; a croner backfill job handles existing tasks and retries any failures.

## Problem Frame

The existing `/api/search` endpoint uses `ILIKE '%query%'` pattern matching with a hand-written relevance heuristic. It only finds tasks when the user's exact terms appear in title or description. As project backlogs grow, this breaks down — "auth issue" won't match "fix login bug," and users can't recall exact phrasing. Semantic search closes this gap by matching on meaning rather than literal text.

## Requirements Trace

- R1. Tasks have a vector embedding stored in a dedicated table, linked by task ID
- R2. The embedding model name is stored alongside each vector to enable targeted re-embedding on model changes
- R3. Embedding is generated (fire-and-forget) on task create and on task update when title or description changes
- R4. A scheduled croner job backfills tasks without embeddings and retries any generation failures
- R5. `GET /api/search/semantic` returns ranked task results for a natural-language query
- R6. Semantic search enforces the same workspace access control as the existing keyword search
- R7. The system degrades gracefully when `OPENAI_API_KEY` is unset: task writes always succeed; the semantic search endpoint returns an empty result set without erroring

## Scope Boundaries

- Tasks only — wiki pages, projects, and comments are not embedded in this iteration
- Vector-only search — hybrid BM25+vector with RRF fusion is deferred
- No UI changes beyond wiring the existing search command menu to call the new endpoint
- No embedding provider abstraction layer — OpenAI is the only provider; extract an interface only if a second provider is introduced

### Deferred to Separate Tasks

- Wiki page embeddings: separate task once wiki content settles
- Hybrid search (BM25 + vector + RRF): separate task after measuring retrieval quality
- Admin re-embedding UI / model upgrade tooling: separate task
- Batch embedding in backfill: the croner backfill currently makes one OpenAI API call per task. OpenAI's embedding API accepts arrays — batching 50 tasks into a single request would be ~50× more efficient. Deferred because the per-call approach is simpler, correct at current scale, and well within rate limits.

## Context & Research

### Relevant Code and Patterns

- Existing keyword search: `apps/api/src/search/index.ts`, `apps/api/src/search/controllers/global-search.ts`
- Access control pattern (workspace membership check): `apps/api/src/search/controllers/global-search.ts` — query `workspaceUserTable`, filter via `inArray(projectTable.workspaceId, accessibleWorkspaceIds)`
- Task schema (searchable text: `title`, `description`): `apps/api/src/database/schema.ts` — `taskTable`
- DB connection and migration startup: `apps/api/src/database/index.ts`
- Route + controller pattern: any feature folder under `apps/api/src/{feature}/`
- Fetcher + query hook pattern: `apps/web/src/fetchers/search/global-search.ts`, `apps/web/src/hooks/queries/search/use-global-search.ts`
- Search command menu UI: `apps/web/src/components/search-command-menu/index.tsx`
- Croner dependency (already installed): `croner ^10.0.1` in `apps/api/package.json`
- AppType: `apps/api/src/index.ts` — `typeof searchApi` already included; sub-routes on the search router are covered automatically

### External References

- [Drizzle ORM — vector similarity search with pgvector](https://orm.drizzle.team/docs/guides/vector-similarity-search) — native `vector` type available since drizzle-orm v0.31.0
- [Drizzle ORM — PostgreSQL extensions](https://orm.drizzle.team/docs/extensions/pg)
- [pgvector — HNSW indexes](https://github.com/pgvector/pgvector#hnsw) — HNSW preferred over IVFFlat for datasets that grow incrementally
- [pgvector-node — Drizzle ORM test](https://github.com/pgvector/pgvector-node/blob/master/tests/drizzle-orm.test.mjs)
- [OpenAI text-embedding-3-small](https://platform.openai.com/docs/models/text-embedding-3-small) — supports dimension truncation via `dimensions` parameter

## Key Technical Decisions

- **Native `vector` type, not `customType`**: `drizzle-orm/pg-core` exports `vector` natively as of v0.31.0 (installed version is 0.45.x). The legacy `customType` approach produces quoted type names in migration SQL (`"vector(512)"`) and is broken in several edge cases.

- **512 dimensions with `text-embedding-3-small`**: OpenAI's matryoshka representation learning preserves quality well at 512 dims. The smaller index is faster to query and lighter on disk than the full 1536. **This is a one-way door** — changing dimensions later requires a full re-embed of all rows and re-creation of the HNSW index. If local/offline embedding is needed in future, `nomic-embed-text` at 1024 dims via Ollama is the closest substitute, but that also requires a full re-embed.

- **Separate `taskEmbeddingTable`**: Keeps the hot `taskTable` row lean, allows the embedding table to be truncated and rebuilt independently during model migrations, and makes the backfill query trivial (left join, null check).

- **Extension via custom migration file, not startup SQL**: `CREATE EXTENSION IF NOT EXISTS vector` belongs in a standalone Drizzle custom migration file (`drizzle-kit generate --custom --name=enable-pgvector`), not in `database/index.ts` startup code. The startup-SQL approach breaks integration tests — `tests/api-integration/setup.ts` has its own DB bootstrap that never hits the production startup path, so the extension would be absent when integration tests create the vector column. The custom migration file runs wherever `migrate()` runs: prod, dev, and integration tests alike. **Consequence**: the PostgreSQL user in `DATABASE_URL` must have `CREATE EXTENSION` privileges. Document this in `ENVIRONMENT_SETUP.md`.

- **HNSW index, default parameters** (`m=16, ef_construction=64`): Correct for tens of thousands of rows. IVFFlat is not suitable here — it requires `lists` to be set after data is populated and degrades for frequent inserts. Default HNSW params are sufficient; raise `ef_search` at query time only if recall is measurably poor.

- **Fire-and-forget async + croner backfill**: No job queue is required at this scale. The embedding helper is extracted as a standalone exported function so it can be called directly in tests without racing the controller. The croner backfill handles both historical tasks and any generation failures.

- **New `/api/search/semantic` sub-route**: Added to `apps/api/src/search/index.ts` alongside the existing keyword route. The existing `/api/search` endpoint is unchanged — no regression risk. Frontend calls the semantic endpoint explicitly (toggle or fallback mode in the search UI).

- **Graceful degradation**: If `OPENAI_API_KEY` is unset or empty, `generateEmbedding()` returns `null`. Callers (both the fire-and-forget path and the semantic search controller) check for null and short-circuit cleanly. Task writes always succeed. The semantic search endpoint returns `{ tasks: [] }` rather than a 500.

## Open Questions

### Resolved During Planning

- **`customType` vs native `vector`**: Resolved — native `vector` is available in drizzle-orm 0.45.x; use it.
- **Embedding model and dimensions**: Resolved — `text-embedding-3-small` at 512 dims. One-way door; documented above.
- **HNSW vs IVFFlat**: Resolved — HNSW for incremental write workloads.
- **Hybrid search now or later**: Resolved — vector-only first; hybrid deferred.
- **New endpoint vs `semantic=true` param on existing endpoint**: Resolved — new sub-route to avoid touching the existing endpoint.
- **Provider abstraction layer**: Resolved — skip until a second provider is introduced.

### Deferred to Implementation

- Whether to surface a "semantic search" toggle in the search UI or blend results automatically — leave to the implementer after testing UX in the existing command menu.
- Exact similarity threshold value for result filtering — start with 0.65, tune based on observed result quality.
- Whether `ef_search` needs to be raised for the HNSW index at query time — test after data is populated.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Task write (create/update)
  └─► controller returns response immediately
  └─► generateAndStoreEmbedding(taskId, title, description) — fire-and-forget
        └─► if OPENAI_API_KEY unset → return (no-op)
        └─► openai.embeddings.create({ model, input, dimensions: 512 })
        └─► db.insert(taskEmbeddingTable).onConflictDoUpdate(...)

Croner job (every 15 min)
  └─► SELECT tasks LEFT JOIN taskEmbedding WHERE taskEmbedding.taskId IS NULL LIMIT 50
  └─► generateAndStoreEmbedding(...) for each

GET /api/search/semantic?q=&projectId=&limit=
  └─► if OPENAI_API_KEY unset → return { tasks: [] }
  └─► embed query → queryVector
  └─► workspace access check (same pattern as global-search)
  └─► SELECT tasks ORDER BY embedding <=> queryVector LIMIT limit
        WHERE projectId matches AND similarity > 0.65
  └─► return { tasks: [...] }
```

## Implementation Units

- [ ] **Unit 1: Enable pgvector extension and install dependencies**

  **Goal:** PostgreSQL has the vector extension available and the `openai` npm package is installed.

  **Requirements:** R7 (must not break if key is absent), prerequisite for all other units.

  **Dependencies:** None.

  **Files:**
  - Generate: `apps/api/drizzle/000N_enable-pgvector.sql` (via `drizzle-kit generate --custom --name=enable-pgvector`)
  - Modify: `apps/api/package.json`
  - Modify: `.env.sample`
  - Modify: `ENVIRONMENT_SETUP.md`

  **Approach:**
  - Run `pnpm --filter @kaneo/api db:generate --custom --name=enable-pgvector` to create a blank custom migration file, then fill it with `CREATE EXTENSION IF NOT EXISTS vector;`. This file runs wherever `migrate()` is called — production startup, dev, and integration tests alike.
  - Install `openai` as a production dependency in `apps/api/`.
  - Add `OPENAI_API_KEY=` (empty, optional) to `.env.sample` with a comment explaining it enables semantic search.
  - Add a note to `ENVIRONMENT_SETUP.md` that the PostgreSQL role in `DATABASE_URL` must have `CREATE EXTENSION` privileges (typically the superuser or a role with `CREATE` on the database).

  **Test scenarios:**
  - Test expectation: none — this unit is configuration and startup wiring; correctness is verified by the extension existing in PostgreSQL after API startup.

  **Verification:**
  - `psql -c "\dx vector"` shows the extension installed after `pnpm dev` starts.
  - `pnpm --filter @kaneo/api build` passes.

---

- [ ] **Unit 2: Task embedding table schema and migration**

  **Goal:** `taskEmbeddingTable` exists in the schema and a valid migration is generated.

  **Requirements:** R1, R2.

  **Dependencies:** Unit 1 (extension must exist before the `vector` column can be created).

  **Files:**
  - Modify: `apps/api/src/database/schema.ts`
  - Modify: `apps/api/src/database/index.ts` (add table to schema export)
  - Generate: `apps/api/drizzle/000N_*.sql` (via `db:generate`)

  **Approach:**
  - Define `taskEmbeddingTable` using the native `vector` import from `drizzle-orm/pg-core`:
    - `id` — CUID2 primary key
    - `taskId` — FK to `taskTable.id`, cascade delete/update, unique (one embedding per task)
    - `embedding` — `vector("embedding", { dimensions: 512 })`, not null (rows are only inserted after a successful embedding call; there are no pending rows)
    - `embeddingModel` — `text`, not null, stores e.g. `"text-embedding-3-small-512"`
    - `createdAt`, `updatedAt` — standard timestamps
  - Add a unique index on `taskId` (one row per task, upsert-friendly).
  - Add an HNSW index: `.using("hnsw", table.embedding.op("vector_cosine_ops"))` — Drizzle will emit the correct `USING hnsw` DDL with default params.
  - Add `taskEmbeddingTable` to the schema export object in `apps/api/src/database/index.ts`.
  - Run `pnpm --filter @kaneo/api db:generate` to produce the migration SQL; verify the output contains `vector(512)` (unquoted) and `USING hnsw`.

  **Patterns to follow:**
  - Table structure: any table in `apps/api/src/database/schema.ts` with a FK and timestamps (e.g., `commentTable`).

  **Test scenarios:**
  - Test expectation: none — schema correctness is verified by the migration running cleanly and the HNSW index appearing in `\d task_embedding`.

  **Verification:**
  - Migration runs without error on API startup.
  - `\d task_embedding` in psql shows `vector(512)` column and HNSW index.

---

- [ ] **Unit 3: Embedding service module**

  **Goal:** A standalone, testable module that generates an OpenAI embedding for a text string and upserts it into `taskEmbeddingTable`. A croner job uses this module to backfill tasks without embeddings.

  **Requirements:** R1, R2, R4, R7.

  **Dependencies:** Unit 2.

  **Files:**
  - Create: `apps/api/src/embeddings/generate.ts`
  - Create: `apps/api/src/embeddings/upsert-task-embedding.ts`
  - Create: `apps/api/src/embeddings/backfill.ts`
  - Modify: `apps/api/src/index.ts` (register croner job in startup)
  - Test: `tests/api/embeddings/generate.test.ts`
  - Test: `tests/api/embeddings/upsert-task-embedding.test.ts`

  **Approach:**
  - `generate.ts`: exports `generateEmbedding(text: string): Promise<number[] | null>`. Reads `OPENAI_API_KEY` from env; returns `null` if absent or empty (graceful degradation). Calls OpenAI embeddings API with `model: "text-embedding-3-small"`, `dimensions: 512`. Returns the float array. This function must be importable standalone for direct use in tests.
  - `upsert-task-embedding.ts`: exports `generateAndStoreEmbedding(taskId, title, description)`. Constructs the input text as `[title, description].filter(Boolean).join(" ").trim()`. Calls `generateEmbedding()`; if null, returns early. Upserts into `taskEmbeddingTable` with `onConflictDoUpdate` targeting `taskId`, updating `embedding`, `embeddingModel`, and `updatedAt`.
  - `backfill.ts`: exports a croner job function that queries tasks left-joined on `taskEmbeddingTable` where `taskEmbeddingTable.taskId IS NULL`, limits to 50 per run, calls `generateAndStoreEmbedding` for each. Registered in `apps/api/src/index.ts` `runStartupTasks()` or immediately after with a 15-minute schedule.

  **Test scenarios:**
  - Happy path: `generateEmbedding("fix login bug")` calls the OpenAI client and returns a 512-element float array (mock OpenAI client in tests).
  - Graceful degradation: `generateEmbedding` returns `null` when `OPENAI_API_KEY` is unset.
  - Happy path: `generateAndStoreEmbedding` calls `generateEmbedding` then performs a DB upsert when embedding is non-null.
  - No-op: `generateAndStoreEmbedding` returns early without DB write when `generateEmbedding` returns null.
  - Upsert: calling `generateAndStoreEmbedding` twice for the same `taskId` updates the existing row rather than inserting a duplicate.

  **Verification:**
  - Unit tests pass.
  - After calling `generateAndStoreEmbedding` for a task, a row appears in `task_embedding` with a 512-element vector and `embedding_model = "text-embedding-3-small-512"`.

---

- [ ] **Unit 4: Hook embedding generation into task lifecycle**

  **Goal:** Task create and update controllers fire-and-forget embedding generation. Task delete is a no-op (FK cascade handles the embedding row).

  **Requirements:** R3.

  **Dependencies:** Unit 3.

  **Files:**
  - Modify: `apps/api/src/task/controllers/create-task.ts`
  - Modify: `apps/api/src/task/controllers/update-task.ts`
  - Test: `tests/api/task/embedding-lifecycle.test.ts`

  **Approach:**
  - In `create-task.ts`: after the `db.insert(taskTable)` resolves, call `generateAndStoreEmbedding(task.id, task.title, task.description)` without `await`. Wrap in `.catch(err => console.error(...))` to suppress unhandled rejection.
  - In `update-task.ts`: after the update resolves, check whether `title` or `description` was part of the update payload. If either changed, fire `generateAndStoreEmbedding`. If neither changed, skip. This avoids unnecessary API calls for status or priority-only updates.
  - No changes needed in delete controller — the FK `onDelete: "cascade"` on `taskEmbeddingTable.taskId` removes the embedding row automatically.

  **Patterns to follow:**
  - Existing event publishing pattern in task controllers (fire-and-forget `publishEvent(...).catch(...)`) is the direct analog.

  **Test scenarios:**
  - Happy path (create): task create controller resolves and returns the task; `generateAndStoreEmbedding` is called once with the correct task ID, title, and description.
  - Happy path (update with title change): `generateAndStoreEmbedding` is called after title update.
  - Happy path (update with description change): `generateAndStoreEmbedding` is called after a description-only update.
  - No re-embedding: `generateAndStoreEmbedding` is NOT called when only `status` or `priority` is updated.
  - Error isolation: a thrown error from `generateAndStoreEmbedding` does not propagate to the HTTP response (task create/update still returns 200).

  **Verification:**
  - Unit tests pass.
  - Creating a task via the API results in a row appearing in `task_embedding` within a few seconds.
  - Updating only a task's status does not update the `task_embedding.updated_at` timestamp.

---

- [ ] **Unit 5: Semantic search API endpoint**

  **Goal:** `GET /api/search/semantic?q=&projectId=&limit=` returns ranked task results using cosine similarity.

  **Requirements:** R5, R6, R7.

  **Dependencies:** Units 2, 3.

  **Files:**
  - Create: `apps/api/src/search/controllers/semantic-search.ts`
  - Modify: `apps/api/src/search/index.ts`
  - Test: `tests/api/search/semantic-search.test.ts`
  - Integration test: `tests/api-integration/search/semantic-search.test.ts`

  **Approach:**
  - Controller (`semantic-search.ts`): accepts `{ q, projectId, userId, limit }`. If `OPENAI_API_KEY` is absent, returns `{ tasks: [] }` immediately. Embeds `q` via `generateEmbedding()`. Performs the workspace access check (same pattern as `global-search.ts` — query `workspaceUserTable`, filter by accessible workspace IDs). Queries `taskEmbeddingTable` joined with `taskTable`, ordering by `cosineDistance(embedding, queryVector)` ascending, filtering by `projectId` (if provided) or workspace IDs, limiting to `limit` (default 10, max 50). Returns tasks with their similarity scores. Applies a minimum similarity threshold (0.65, i.e. distance < 0.35).
  - Route (`search/index.ts`): add `.get("/semantic", ...)` with `describeRoute` and a `validator("query", ...)` using Valibot — `q` required string, `projectId` optional string, `limit` optional coercible number.
  - Import `cosineDistance` from `drizzle-orm`; compute `similarity = sql\`1 - (${cosineDistance(...)})\`` for the response payload.

  **Patterns to follow:**
  - `apps/api/src/search/controllers/global-search.ts` — workspace access control pattern.
  - `apps/api/src/search/index.ts` — route definition alongside the existing keyword search route.

  **Test scenarios:**
  - Happy path: returns ranked tasks ordered by similarity for a well-matched query.
  - Graceful degradation: returns `{ tasks: [] }` when `OPENAI_API_KEY` is unset, with no error thrown.
  - Access control: a user cannot see tasks from workspaces they are not a member of, even if embeddings exist.
  - projectId filter: when `projectId` is provided, results are scoped to that project only.
  - Empty result: query with no similarity matches above threshold returns `{ tasks: [] }`.
  - Limit: response contains at most `limit` results.
  - Integration: embedding a query and running it against a known task embedding returns that task in the top result (requires a real pgvector instance — integration test territory, not unit test).

  **Verification:**
  - Unit tests pass.
  - `curl "http://localhost:1337/api/search/semantic?q=authentication+bug&projectId=...&limit=5"` returns a JSON array of task objects ranked by semantic similarity.

---

- [ ] **Unit 6: Frontend integration**

  **Goal:** The existing search command menu can perform semantic search and display results.

  **Requirements:** R5 (frontend surface).

  **Dependencies:** Unit 5.

  **Files:**
  - Create: `apps/web/src/fetchers/search/semantic-search.ts`
  - Create: `apps/web/src/hooks/queries/search/use-semantic-search.ts`
  - Modify: `apps/web/src/components/search-command-menu/index.tsx`

  **Approach:**
  - Fetcher: mirrors `global-search.ts` — calls `client.search.semantic.$get({ query: { q, projectId, limit } })` via the typed Hono client and passes through `unwrapResponse`.
  - Query hook: TanStack Query, `queryKey: ["search", "semantic", params]`, `staleTime: 30s`, `enabled: params.q.length >= 2`. The slightly higher threshold (2 chars vs 1) avoids embedding single-character queries.
  - Search command menu: implementer decides on the exact UX — a "Semantic" tab alongside keyword results, a toggle, or a fallback when keyword results are empty. The plan does not prescribe the exact UI shape; surfacing the results is the requirement.

  **Patterns to follow:**
  - `apps/web/src/fetchers/search/global-search.ts`
  - `apps/web/src/hooks/queries/search/use-global-search.ts`
  - `apps/web/src/components/search-command-menu/index.tsx`

  **Test scenarios:**
  - Happy path: hook returns ranked task results when `q.length >= 2`.
  - Disabled: hook does not fire when `q.length < 2`.
  - Empty state: renders gracefully when semantic search returns `{ tasks: [] }`.

  **Verification:**
  - Typing a natural-language phrase in the search command menu triggers the semantic search hook and displays task results not reachable by keyword match (e.g., "authentication problem" returns a task titled "fix login bug").

## System-Wide Impact

- **Access control invariant preserved**: semantic search uses the identical workspace membership lookup as the existing keyword search — no new access surface.
- **Task write latency unchanged**: embedding generation is fire-and-forget; `POST /api/task` and `PATCH /api/task/:id` response times are unaffected.
- **AppType unchanged**: the semantic sub-route is on the existing `searchApi` router; `typeof searchApi` in `AppType` covers it automatically.
- **Migration ordering**: the custom migration file enabling the `vector` extension must be numbered lower than the migration that creates the `vector(512)` column. Drizzle migrations run in filename order; ensure the `enable-pgvector` migration gets a lower sequence number than the `taskEmbeddingTable` migration.
- **PostgreSQL privilege requirement**: the database user must have `CREATE EXTENSION` privileges. This is a new deployment prerequisite not currently documented.
- **Existing keyword search unchanged**: `/api/search` and `use-global-search` are not modified.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `OPENAI_API_KEY` unset in self-hosted deployments | Graceful degradation: all paths return null/empty rather than erroring |
| PostgreSQL user lacks `CREATE EXTENSION` privileges | Document in `ENVIRONMENT_SETUP.md`; the `IF NOT EXISTS` guard prevents crashes if the extension was pre-installed by a superuser |
| 512-dimension lock-in | Documented as a one-way door in Key Technical Decisions; any future dimension change requires full re-embed and index rebuild |
| HNSW index build time on initial backfill | At tens of thousands of rows, HNSW builds in seconds — not a meaningful risk at current scale |
| OpenAI API rate limits during initial backfill | Croner backfill runs 50 tasks per 15-minute cycle — well within free-tier limits |
| Embedding generation failure on task write | Error is caught and logged; task write still succeeds; croner backfill picks up the gap |

## Documentation / Operational Notes

- Add `OPENAI_API_KEY` to `.env.sample` and `ENVIRONMENT_SETUP.md` as an optional variable.
- Document the PostgreSQL `CREATE EXTENSION` privilege requirement in `ENVIRONMENT_SETUP.md`.
- The croner backfill processes 50 tasks per 15-minute cycle. For an initial deployment with thousands of existing tasks, a one-time manual trigger of the backfill function (or a temporary shorter interval) may be useful.
- Re-embedding all tasks (e.g., for a model upgrade) is a manual operation: truncate `task_embedding`, allow the croner to backfill, or invoke the backfill function directly.

## Sources & References

- Related code: `apps/api/src/search/`, `apps/api/src/database/schema.ts`, `apps/api/src/database/index.ts`
- External docs: [Drizzle ORM — vector similarity search](https://orm.drizzle.team/docs/guides/vector-similarity-search)
- External docs: [pgvector HNSW indexes — Crunchy Data](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector)
- External docs: [OpenAI text-embedding-3-small](https://platform.openai.com/docs/models/text-embedding-3-small)
