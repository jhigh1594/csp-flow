import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { teamTable } from "../../database/schema";

export async function requireTeamInWorkspace(
  teamId: string,
  workspaceId: string,
): Promise<void> {
  const [team] = await db
    .select({ id: teamTable.id })
    .from(teamTable)
    .where(
      and(eq(teamTable.id, teamId), eq(teamTable.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!team) throw new HTTPException(404, { message: "Team not found" });
}
