import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateEmbedding = vi.hoisted(() => vi.fn());

vi.mock("../../../apps/api/src/embeddings/generate", () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("../../../apps/api/src/database", () => ({
  default: mockDb,
}));

vi.mock("../../../apps/api/src/database/schema", () => ({
  taskEmbeddingTable: { taskId: "task_id_col", embedding: "embedding_col" },
  taskTable: {
    id: "task_id_col",
    projectId: "project_id_col",
    title: "title_col",
    description: "desc_col",
    status: "status_col",
    priority: "priority_col",
  },
  projectTable: { id: "proj_id_col", workspaceId: "workspace_id_col" },
}));

import { semanticSearch } from "../../../apps/api/src/search/controllers/semantic-search";

const FAKE_ROW = {
  taskId: "task-1",
  title: "Fix login bug",
  description: "Users cannot log in",
  status: "to-do",
  priority: "high",
  projectId: "proj-1",
  distance: 0.15,
};

describe("semanticSearch", () => {
  beforeEach(() => {
    const limit = vi.fn().mockResolvedValue([FAKE_ROW]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const innerJoin2 = vi.fn().mockReturnValue({ where });
    const innerJoin1 = vi.fn().mockReturnValue({ innerJoin: innerJoin2 });
    const from = vi.fn().mockReturnValue({ innerJoin: innerJoin1 });
    mockDb.select.mockReturnValue({ from });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns ranked results with similarity score", async () => {
    const fakeEmbedding = Array.from({ length: 512 }, () => 0.1);
    mockGenerateEmbedding.mockResolvedValueOnce(fakeEmbedding);

    const results = await semanticSearch({ query: "login issue" });

    expect(results).toHaveLength(1);
    expect(results[0].taskId).toBe("task-1");
    expect(results[0].similarity).toBeCloseTo(0.85);
  });

  it("returns empty array when generateEmbedding returns null", async () => {
    mockGenerateEmbedding.mockResolvedValueOnce(null);

    const results = await semanticSearch({ query: "anything" });

    expect(results).toEqual([]);
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("passes limit to database query", async () => {
    const fakeEmbedding = Array.from({ length: 512 }, () => 0.1);
    mockGenerateEmbedding.mockResolvedValueOnce(fakeEmbedding);

    await semanticSearch({ query: "bug", limit: 5 });

    expect(mockGenerateEmbedding).toHaveBeenCalledWith("bug");
  });
});
