const BASE = import.meta.env.VITE_API_URL ?? "";

export async function json<T>(
  path: string,
  opts?: RequestInit
): Promise<T> {
  const url = BASE + path;
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...opts?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}

