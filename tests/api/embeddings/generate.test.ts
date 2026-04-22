import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateEmbedding } from "../../../apps/api/src/embeddings/generate";

describe("generateEmbedding", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "fake-gemini-key";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("returns a 512-element float array on success", async () => {
    const embedding = Array.from({ length: 512 }, (_, i) => i / 512);
    const mockEmbedContent = vi.fn().mockResolvedValueOnce({
      embeddings: [{ values: embedding }],
    });
    const fakeClient = { models: { embedContent: mockEmbedContent } };

    const result = await generateEmbedding("fix login bug", fakeClient);

    expect(result).toEqual(embedding);
    expect(result).toHaveLength(512);
    expect(mockEmbedContent).toHaveBeenCalledWith({
      model: "text-embedding-004",
      contents: "fix login bug",
      config: { outputDimensionality: 512 },
    });
  });

  it("returns null when GEMINI_API_KEY is unset", async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await generateEmbedding("anything");

    expect(result).toBeNull();
  });

  it("returns null when GEMINI_API_KEY is empty string", async () => {
    process.env.GEMINI_API_KEY = "";

    const result = await generateEmbedding("anything");

    expect(result).toBeNull();
  });
});
