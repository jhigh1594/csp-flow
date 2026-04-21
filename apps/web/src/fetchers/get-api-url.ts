export function getApiUrl(path: string) {
  const trimmedBase = (
    import.meta.env.VITE_API_URL || "http://localhost:1337"
  ).replace(/\/+$/, "");
  const apiUrl = trimmedBase.endsWith("/api")
    ? trimmedBase
    : `${trimmedBase}/api`;
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
