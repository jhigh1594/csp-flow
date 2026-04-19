# Wiki Image Uploads Design

**Date:** 2026-04-19
**Branch:** feat/image-uploads
**Status:** Approved

## Context

Task descriptions and comments already have a working image upload pipeline: presigned R2 PUT URLs, direct browser-to-R2 upload, finalize endpoint, asset record in DB, served via `/api/asset/:id` proxy. The wiki editor has Tiptap's `ImageUploadNode` and `ImageUploadButton` wired in, but `handleImageUpload` in `tiptap-utils.ts` is a stub that simulates progress and returns a hardcoded placeholder URL. This spec closes that gap.

**Storage:** Cloudflare R2 (S3-compatible). Bucket: `csp-flow-assets`. Credentials in `.env`.

## Data Layer

### Schema change — `asset` table

Add one nullable column following the same pattern as `taskId` and `activityId`:

```typescript
wikiPageId: text("wiki_page_id").references(() => wikiPageTable.id, {
  onDelete: "cascade",
  onUpdate: "cascade",
})
// index: "asset_wikiPageId_idx" on table.wikiPageId
```

Generate and run migration via `pnpm --filter @kaneo/api db:generate`.

### `UploadSurface` type

Extend in `apps/api/src/storage/s3.ts` and `apps/web/src/lib/upload-wiki-image.ts`:

```typescript
type UploadSurface = "description" | "comment" | "wiki";
```

The existing `surface` picklist validator in the task finalize endpoint stays as `["description", "comment"]` — wiki gets its own endpoints.

## Storage

### New S3 key builder in `s3.ts`

Add `buildWikiObjectKey` alongside the existing `buildObjectKey`:

```
workspace/{workspaceId}/project/{projectId}/wiki/{wikiPageId}/images/{basename}-{timestamp}-{cuid}.{ext}
```

Reuses existing helpers: `sanitizePathSegment`, `getFileExtension`, `createId`.

## API

Two new endpoints added to `apps/api/src/wiki/index.ts`, mirroring the task upload pattern exactly:

### `PUT /wiki/:id/image-upload`

- Auth: `workspaceAccess.fromWikiPage()` (already exists)
- Body: `{ filename, contentType, size }`
- Validates via `validateTaskAssetUploadInput(contentType, size)`
- Looks up `workspaceId` + `projectId` from wiki page (join through `projectTable`)
- Calls `createTaskImageUploadUrl` with wiki-specific key builder
- Returns `{ key, uploadUrl, headers }`

### `POST /wiki/:id/image-upload/finalize`

- Auth: `workspaceAccess.fromWikiPage()`
- Body: `{ key, filename, contentType, size }`
- Validates key starts with expected wiki prefix via new `assertWikiImageKeyMatchesContext`
- Upserts into `asset` table with `wikiPageId` set, `taskId` null
- Returns `{ id, url: "/api/asset/:id" }`

The existing `/api/asset/:id` proxy endpoint handles serving — no changes needed there since it joins on `projectTable` which wiki assets also have via `wikiPageTable → projectTable`.

## Frontend

### New fetcher — `apps/web/src/fetchers/wiki/create-wiki-image-upload.ts`

Mirrors `apps/web/src/fetchers/task/create-image-upload.ts`. Calls:
- `client.wiki["image-upload"][":id"].$put(...)` 
- `client.wiki["image-upload"][":id"].finalize.$post(...)`

### New lib — `apps/web/src/lib/upload-wiki-image.ts`

Mirrors `apps/web/src/lib/upload-task-image.ts`. Accepts `{ pageId, file }` (no `surface` parameter — wiki uploads always use `"wiki"`).

### Wiki editor changes — `apps/web/src/components/wiki/wiki-editor.tsx`

1. Add `pageId: string` to `WikiEditorProps`
2. Store it in a `pageIdRef` so the upload closure always has the latest value
3. Replace the `handleImageUpload` stub in `ImageUploadNode.configure({ upload: ... })` with a closure that calls `uploadWikiImage({ pageId: pageIdRef.current, file })`

### Wiki page editor — `apps/web/src/components/wiki/wiki-page-editor.tsx`

Pass `pageId` down to `WikiEditor`. The value is already available from the route params (`$pageId`).

## Data Flow

```
User drops/pastes/picks image in wiki editor
  → ImageUploadNode calls upload fn with File
  → PUT /wiki/:pageId/image-upload  → { key, uploadUrl, headers }
  → fetch(uploadUrl, { method: PUT, body: file })  →  R2
  → POST /wiki/:pageId/image-upload/finalize  → { id, url: "/api/asset/:id" }
  → ImageUploadNode inserts <img src="/api/asset/:id"> into editor
  → Editor content saves as usual (wiki page JSON/HTML)
```

## What Is Not Changing

- Task description and comment uploads: untouched
- `/api/asset/:id` serving endpoint: untouched
- Wiki page save flow: untouched
- `handleImageUpload` stub: removed from `ImageUploadNode.configure` in wiki editor only; the export stays in `tiptap-utils.ts` since it may be referenced elsewhere

## Error Handling

Follows existing task upload pattern:
- File too large → 400 from API, toast on frontend
- S3 not configured → 500 with message "S3 uploads are not configured"
- Key mismatch on finalize → 400 "Image upload key does not match the wiki page context"
- Wiki page not found → 404

## Out of Scope

- Deleting orphaned R2 objects when assets are deleted (cascade handles DB rows; R2 cleanup is a separate concern)
- Image resizing / optimization
- Progress indicators beyond what `ImageUploadNode` provides natively
