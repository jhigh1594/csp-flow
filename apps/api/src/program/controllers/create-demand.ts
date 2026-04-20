import { eq, max } from "drizzle-orm";
import db from "../../database";
import { demandTable } from "../../database/schema";

async function createDemand({
  teamId,
  name,
  businessPartnershipDate,
  discoveryDate,
  requirementsDate,
  demandSubmissionDate,
  developmentDate,
  uatDate,
  goLiveDate,
  adoptionDate,
}: {
  teamId: string;
  name: string;
  businessPartnershipDate?: string | null;
  discoveryDate?: string | null;
  requirementsDate?: string | null;
  demandSubmissionDate?: string | null;
  developmentDate?: string | null;
  uatDate?: string | null;
  goLiveDate?: string | null;
  adoptionDate?: string | null;
}) {
  const [maxResult] = await db
    .select({ maxSort: max(demandTable.sortOrder) })
    .from(demandTable)
    .where(eq(demandTable.teamId, teamId));

  const sortOrder = (maxResult?.maxSort ?? -1) + 1;

  const [demand] = await db
    .insert(demandTable)
    .values({
      teamId,
      name,
      sortOrder,
      businessPartnershipDate: businessPartnershipDate ?? null,
      discoveryDate: discoveryDate ?? null,
      requirementsDate: requirementsDate ?? null,
      demandSubmissionDate: demandSubmissionDate ?? null,
      developmentDate: developmentDate ?? null,
      uatDate: uatDate ?? null,
      goLiveDate: goLiveDate ?? null,
      adoptionDate: adoptionDate ?? null,
    })
    .returning();

  return demand;
}

export default createDemand;
