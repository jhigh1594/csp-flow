import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  archiveWikiPage,
  unarchiveWikiPage,
} from "./controllers/archive-wiki-page";
import createWikiPage from "./controllers/create-wiki-page";
import deleteWikiPage from "./controllers/delete-wiki-page";
import getWikiPage from "./controllers/get-wiki-page";
import getWikiPages from "./controllers/get-wiki-pages";
import { lockWikiPage, unlockWikiPage } from "./controllers/lock-wiki-page";
import updateWikiPage from "./controllers/update-wiki-page";

const wiki = new Hono<{ Variables: { userId: string } }>()
  .get(
    "/project/:projectId",
    describeRoute({
      operationId: "listWikiPages",
      tags: ["Wiki"],
      description: "Get all wiki pages for a project",
      responses: {
        200: {
          description: "List of wiki pages",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ projectId: v.string() })),
    workspaceAccess.fromProject("projectId"),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const pages = await getWikiPages(projectId);
      return c.json(pages);
    },
  )
  .post(
    "/",
    describeRoute({
      operationId: "createWikiPage",
      tags: ["Wiki"],
      description: "Create a new wiki page",
      responses: {
        200: {
          description: "Created wiki page",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator(
      "json",
      v.object({
        projectId: v.string(),
        title: v.pipe(v.string(), v.minLength(1)),
      }),
    ),
    workspaceAccess.fromProject("projectId"),
    async (c) => {
      const { projectId, title } = c.req.valid("json");
      const userId = c.get("userId");
      const result = await createWikiPage({ projectId, title, userId });
      return c.json(result);
    },
  )
  .get(
    "/:id",
    describeRoute({
      operationId: "getWikiPage",
      tags: ["Wiki"],
      description: "Get a single wiki page",
      responses: {
        200: {
          description: "Wiki page",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromWikiPage(),
    async (c) => {
      const { id } = c.req.valid("param");
      const page = await getWikiPage(id);
      if (!page) {
        throw new HTTPException(404, { message: "Page not found" });
      }
      return c.json(page);
    },
  )
  .patch(
    "/:id",
    describeRoute({
      operationId: "updateWikiPage",
      tags: ["Wiki"],
      description: "Update a wiki page",
      responses: {
        200: {
          description: "Updated wiki page",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    validator(
      "json",
      v.object({
        title: v.optional(v.string()),
        contentHtml: v.optional(v.string()),
        contentJson: v.optional(v.any()),
      }),
    ),
    workspaceAccess.fromWikiPage(),
    async (c) => {
      const { id } = c.req.valid("param");
      const { title, contentHtml, contentJson } = c.req.valid("json");

      const page = await getWikiPage(id);
      if (!page) {
        throw new HTTPException(404, { message: "Page not found" });
      }
      if (page.isLocked) {
        throw new HTTPException(403, { message: "Page is locked" });
      }

      const result = await updateWikiPage({
        id,
        title,
        contentHtml,
        contentJson,
      });
      return c.json(result);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      operationId: "deleteWikiPage",
      tags: ["Wiki"],
      description: "Delete a wiki page (must be archived first)",
      responses: {
        200: {
          description: "Deletion result",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromWikiPage(),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await deleteWikiPage(id);
      return c.json(result);
    },
  )
  .post(
    "/:id/archive",
    describeRoute({
      operationId: "archiveWikiPage",
      tags: ["Wiki"],
      description: "Archive a wiki page",
      responses: {
        200: {
          description: "Archived wiki page",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromWikiPage(),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await archiveWikiPage(id);
      return c.json(result);
    },
  )
  .delete(
    "/:id/archive",
    describeRoute({
      operationId: "unarchiveWikiPage",
      tags: ["Wiki"],
      description: "Unarchive a wiki page",
      responses: {
        200: {
          description: "Unarchived wiki page",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromWikiPage(),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await unarchiveWikiPage(id);
      return c.json(result);
    },
  )
  .post(
    "/:id/lock",
    describeRoute({
      operationId: "lockWikiPage",
      tags: ["Wiki"],
      description: "Lock a wiki page",
      responses: {
        200: {
          description: "Locked wiki page",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromWikiPage(),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await lockWikiPage(id);
      return c.json(result);
    },
  )
  .delete(
    "/:id/lock",
    describeRoute({
      operationId: "unlockWikiPage",
      tags: ["Wiki"],
      description: "Unlock a wiki page",
      responses: {
        200: {
          description: "Unlocked wiki page",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromWikiPage(),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await unlockWikiPage(id);
      return c.json(result);
    },
  );

export default wiki;
