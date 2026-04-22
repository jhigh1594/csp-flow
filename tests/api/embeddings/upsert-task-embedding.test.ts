import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.hoisted(() => vi.fn());
const mockValues = vi.hoisted(() => vi.fn());
const mockOnConflict = vi.hoisted(() => vi.fn());

vi.mock("../../../apps/api/src/database", () => ({
  default: { insert: mockInsert },
}));

vi.mock("../../../apps/api/src/database/schema", () => ({
  taskEmbeddingTable: { taskId: "task_id_col" },
}));

const mockGenerateEmbedding = vi.hoisted(() => vi.fn());

vi.mock("../../../apps/api/src/embeddings/generate", () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

import { generateAndStoreEmbedding } from "../../../apps/api/src/embeddings/upsert-task-embedding";

describe("generateAndStoreEmbedding", () => {
  beforeEach(() => {
    mockOnConflict.mockResolvedValue(undefined);
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    mockInsert.mockReturnValue({ values: mockValues });
    mockGenerateEmbedding.mockClear();
    mockInsert.mockClear();
    mockValues.mockClear();
    mockOnConflict.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("upserts embedding when generateEmbedding returns a vector", async () => {
    const fakeEmbedding = Array.from({ length: 512 }, () => 0.1);
    mockGenerateEmbedding.mockResolvedValueOnce(fakeEmbedding);

    await generateAndStoreEmbedding(
      "task-1",
      "Fix login bug",
      "Users can't log in",
    );

    expect(mockGenerateEmbedding).toHaveBeenCalledWith(
      "Fix login bug Users can't log in",
    );
    expect(mockInsert).toHaveBeenCalled();
  });

  it("constructs input from title only when description is null", async () => {
    const fakeEmbedding = Array.from({ length: 512 }, () => 0.2);
    mockGenerateEmbedding.mockResolvedValueOnce(fakeEmbedding);

    await generateAndStoreEmbedding("task-2", "Fix login bug", null);

    expect(mockGenerateEmbedding).toHaveBeenCalledWith("Fix login bug");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns early without DB write when generateEmbedding returns null", async () => {
    mockGenerateEmbedding.mockResolvedValueOnce(null);

    await generateAndStoreEmbedding("task-3", "Some task", undefined);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});
