import { describe, expect, it } from "vitest";
import {
  getCurrentWeekStart,
  subtractWeeks,
} from "../../../apps/api/src/program/utils/week";

describe("getCurrentWeekStart", () => {
  it("returns a Monday in YYYY-MM-DD format", () => {
    const result = getCurrentWeekStart();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const day = new Date(`${result}T00:00:00Z`).getUTCDay();
    expect(day).toBe(1);
  });

  it("returns the same value when called twice in quick succession", () => {
    expect(getCurrentWeekStart()).toBe(getCurrentWeekStart());
  });
});

describe("subtractWeeks", () => {
  it("subtracts 1 week correctly", () => {
    expect(subtractWeeks("2025-04-21", 1)).toBe("2025-04-14");
  });

  it("subtracts 4 weeks correctly", () => {
    expect(subtractWeeks("2025-04-21", 4)).toBe("2025-03-24");
  });

  it("handles month boundary", () => {
    expect(subtractWeeks("2025-03-03", 1)).toBe("2025-02-24");
  });

  it("handles year boundary", () => {
    expect(subtractWeeks("2025-01-06", 1)).toBe("2024-12-30");
  });

  it("returns same date when subtracting 0 weeks", () => {
    expect(subtractWeeks("2025-04-21", 0)).toBe("2025-04-21");
  });
});
