import { resolveApiBaseUrl } from "@/lib/resolve-api-url";

export function getApiUrl(path: string) {
  const apiUrl = resolveApiBaseUrl();
  const normalizedPath = `/${path.replace(/^\/+/, "")}`;

  return `${apiUrl}${normalizedPath}`;
}

export async function unwrapResponse<T>(response: {
  ok: boolean;
  text: () => Promise<string>;
  json: () => Promise<T>;
}): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  return response.json();
}
