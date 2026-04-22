import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSIONS = 512;

type EmbeddingClient = {
  models: {
    embedContent: (params: {
      model: string;
      contents: string;
      config?: { outputDimensionality?: number };
    }) => Promise<{ embeddings?: Array<{ values?: number[] }> }>;
  };
};

export async function generateEmbedding(
  text: string,
  client?: EmbeddingClient,
): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = client ?? new GoogleGenAI({ apiKey });
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  return response.embeddings?.[0]?.values ?? null;
}
