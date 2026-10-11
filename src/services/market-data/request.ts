export async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": "polymarket-research-lab/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return await response.json() as T;
}
