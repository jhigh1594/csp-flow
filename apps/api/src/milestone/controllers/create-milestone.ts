import db from "../../database";
import { milestoneTable } from "../../database/schema";

type CreateMilestoneInput = {
  projectId: string;
  title: string;
  targetDate: Date;
};

async function createMilestone({
  projectId,
  title,
  targetDate,
}: CreateMilestoneInput) {
  const [milestone] = await db
    .insert(milestoneTable)
    .values({ projectId, title, targetDate })
    .returning();

  return milestone;
}

export default createMilestone;
