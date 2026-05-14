import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import getWorkspaceMembersCtrl from "./controllers/get-workspace-members";
import updateMemberRole from "./controllers/update-member-role";

const workspace = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>()
  .get(
    "/:workspaceId/members",
    describeRoute({
      operationId: "getWorkspaceMembers",
      tags: ["Workspaces"],
      description: "Get all members of a workspace",
      responses: {
        200: {
          description: "List of workspace members",
          content: {
            "application/json": {
              schema: resolver(
                v.array(
                  v.object({
                    id: v.string(),
                    name: v.string(),
                    email: v.string(),
                    image: v.nullable(v.string()),
                    role: v.string(),
                  }),
                ),
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const members = await getWorkspaceMembersCtrl(workspaceId);
      return c.json(members);
    },
  )
  .patch(
    "/members/:memberId/role",
    describeRoute({
      operationId: "updateMemberRole",
      tags: ["Workspaces"],
      description: "Update a workspace member's role",
      responses: {
        200: {
          description: "Member role updated successfully",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ memberId: v.string() })),
    validator(
      "json",
      v.object({
        role: v.picklist(["admin", "member"]),
      }),
    ),
    workspaceAccess.fromWorkspaceMember("memberId"),
    async (c) => {
      const { memberId } = c.req.valid("param");
      const { role } = c.req.valid("json");
      const member = await updateMemberRole(memberId, role);
      return c.json(member);
    },
  );

export default workspace;
