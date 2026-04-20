import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { demandTable } from "../../database/schema";

async function updateDemand({
  demandId,
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
  demandId: string;
  name?: string;
  businessPartnershipDate?: string | null;
  discoveryDate?: string | null;
  requirementsDate?: string | null;
  demandSubmissionDate?: string | null;
  developmentDate?: string | null;
  uatDate?: string | null;
  goLiveDate?: string | null;
  adoptionDate?: string | null;
}) {
  const updateValues: Partial<typeof demandTable.$inferInsert> = {};

  if (name !== undefined) {
    updateValues.name = name;
  }
  if (businessPartnershipDate !== undefined) {
    updateValues.businessPartnershipDate = businessPartnershipDate;
  }
  if (discoveryDate !== undefined) {
    updateValues.discoveryDate = discoveryDate;
  }
  if (requirementsDate !== undefined) {
    updateValues.requirementsDate = requirementsDate;
  }
  if (demandSubmissionDate !== undefined) {
    updateValues.demandSubmissionDate = demandSubmissionDate;
  }
  if (developmentDate !== undefined) {
    updateValues.developmentDate = developmentDate;
  }
  if (uatDate !== undefined) {
    updateValues.uatDate = uatDate;
  }
  if (goLiveDate !== undefined) {
    updateValues.goLiveDate = goLiveDate;
  }
  if (adoptionDate !== undefined) {
    updateValues.adoptionDate = adoptionDate;
  }

  const [demand] = await db
    .update(demandTable)
    .set(updateValues)
    .where(eq(demandTable.id, demandId))
    .returning();

  if (!demand) {
    throw new HTTPException(404, { message: "Demand not found" });
  }

  return demand;
}

export default updateDemand;
