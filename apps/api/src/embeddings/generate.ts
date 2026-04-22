import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 512;

type EmbeddingClient = {
  embeddings: {
    create: (params: {
      model: string;
      input: string;
      dimensions: number;
    }) => Promise<{ data: Array<{ embedding: number[] }> }>;
  };
};

export async function generateEmbedding(
  text: string,
  client?: EmbeddingClient,
): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const openai = client ?? new OpenAI({ apiKey });
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0]?.embedding ?? null;
}
