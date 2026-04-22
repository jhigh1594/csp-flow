import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateEmbedding } from "../../../apps/api/src/embeddings/generate";

describe("generateEmbedding", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("returns a 512-element float array on success", async () => {
    const embedding = Array.from({ length: 512 }, (_, i) => i / 512);
    const mockCreate = vi.fn().mockResolvedValueOnce({ data: [{ embedding }] });
    const fakeClient = { embeddings: { create: mockCreate } };

    const result = await generateEmbedding("fix login bug", fakeClient);

    expect(result).toEqual(embedding);
    expect(result).toHaveLength(512);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "fix login bug",
      dimensions: 512,
    });
  });

  it("returns null when OPENAI_API_KEY is unset", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await generateEmbedding("anything");

    expect(result).toBeNull();
  });

  it("returns null when OPENAI_API_KEY is empty string", async () => {
    process.env.OPENAI_API_KEY = "";

    const result = await generateEmbedding("anything");

    expect(result).toBeNull();
  });
});
