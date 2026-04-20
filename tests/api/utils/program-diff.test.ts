import { describe, expect, it } from "vitest";
import {
  diffDemands,
  diffReleases,
  diffRisks,
} from "../../../apps/api/src/program/utils/diff";

describe("diffDemands", () => {
  it("detects a newly added demand", () => {
    const result = diffDemands(
      [],
      [{ id: "d1", name: "Portal Login" }],
    );
    expect(result).toEqual([{ type: "added", name: "Portal Login" }]);
  });

  it("detects a removed demand", () => {
    const result = diffDemands(
      [{ id: "d1", name: "Portal Login" }],
      [],
    );
    expect(result).toEqual([{ type: "removed", name: "Portal Login" }]);
  });

  it("detects a date change on an existing demand", () => {
    const result = diffDemands(
      [{ id: "d1", name: "Portal Login", goLiveDate: "2025-06-01" }],
      [{ id: "d1", name: "Portal Login", goLiveDate: "2025-07-01" }],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "changed",
      name: "Portal Login",
      dateChanges: {
        goLiveDate: { from: "2025-06-01", to: "2025-07-01" },
      },
    });
  });

  it("does not emit changed when dates are identical", () => {
    const result = diffDemands(
      [{ id: "d1", name: "Same", goLiveDate: "2025-06-01" }],
      [{ id: "d1", name: "Same", goLiveDate: "2025-06-01" }],
    );
    expect(result).toHaveLength(0);
  });

  it("keys by id not name — two demands with the same name are tracked separately", () => {
    const result = diffDemands(
      [
        { id: "d1", name: "Duplicate" },
        { id: "d2", name: "Duplicate" },
      ],
      [{ id: "d1", name: "Duplicate" }],
    );
    expect(result).toEqual([{ type: "removed", name: "Duplicate" }]);
  });

  it("handles empty both sides", () => {
    expect(diffDemands([], [])).toEqual([]);
  });
});

describe("diffRisks", () => {
  it("detects a new risk", () => {
    const result = diffRisks(
      [],
      [{ id: "r1", description: "Data breach", status: "open" }],
    );
    expect(result).toEqual([{ type: "new", description: "Data breach" }]);
  });

  it("detects a status change to mitigated", () => {
    const result = diffRisks(
      [{ id: "r1", description: "Data breach", status: "open" }],
      [{ id: "r1", description: "Data breach", status: "mitigated" }],
    );
    expect(result).toEqual([
      {
        type: "statusChanged",
        description: "Data breach",
        from: "open",
        to: "mitigated",
      },
    ]);
  });

  it("detects a status change to closed", () => {
    const result = diffRisks(
      [{ id: "r1", description: "Data breach", status: "open" }],
      [{ id: "r1", description: "Data breach", status: "closed" }],
    );
    expect(result).toEqual([
      {
        type: "closed",
        description: "Data breach",
        from: "open",
        to: "closed",
      },
    ]);
  });

  it("closed risk appears only once — not as both closed and statusChanged", () => {
    const result = diffRisks(
      [{ id: "r1", description: "Bug", status: "open" }],
      [{ id: "r1", description: "Bug", status: "closed" }],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("closed");
  });

  it("does not emit anything for a risk with unchanged status", () => {
    const result = diffRisks(
      [{ id: "r1", description: "Bug", status: "open" }],
      [{ id: "r1", description: "Bug", status: "open" }],
    );
    expect(result).toHaveLength(0);
  });

  it("ignores risks only present in from (already gone)", () => {
    const result = diffRisks(
      [{ id: "r1", description: "Old risk", status: "open" }],
      [],
    );
    expect(result).toHaveLength(0);
  });
});

describe("diffReleases", () => {
  it("detects a newly added release", () => {
    const result = diffReleases(
      [],
      [{ id: "rel1", name: "v1.0", quarter: "q1", month: 1, fiscalYear: 2026 }],
    );
    expect(result).toEqual([{ type: "added", name: "v1.0" }]);
  });

  it("detects a removed release", () => {
    const result = diffReleases(
      [{ id: "rel1", name: "v1.0", quarter: "q1", month: 1, fiscalYear: 2026 }],
      [],
    );
    expect(result).toEqual([{ type: "removed", name: "v1.0" }]);
  });

  it("detects a release moved to a different quarter", () => {
    const result = diffReleases(
      [{ id: "rel1", name: "v1.0", quarter: "q1", month: 1, fiscalYear: 2026 }],
      [{ id: "rel1", name: "v1.0", quarter: "q2", month: 4, fiscalYear: 2026 }],
    );
    expect(result).toEqual([
      {
        type: "moved",
        name: "v1.0",
        from: "Q1 2026",
        to: "Q2 2026",
      },
    ]);
  });

  it("detects a release moved to a different fiscal year", () => {
    const result = diffReleases(
      [{ id: "rel1", name: "v2.0", quarter: "q4", month: 12, fiscalYear: 2025 }],
      [{ id: "rel1", name: "v2.0", quarter: "q1", month: 1, fiscalYear: 2026 }],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "moved", from: "Q4 2025", to: "Q1 2026" });
  });

  it("does not emit moved when nothing changed", () => {
    const result = diffReleases(
      [{ id: "rel1", name: "v1.0", quarter: "q1", month: 1, fiscalYear: 2026 }],
      [{ id: "rel1", name: "v1.0", quarter: "q1", month: 1, fiscalYear: 2026 }],
    );
    expect(result).toHaveLength(0);
  });
});
