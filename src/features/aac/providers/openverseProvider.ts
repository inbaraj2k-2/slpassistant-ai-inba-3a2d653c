import type { AacResult } from "../types";

// Openverse public API — no key required for anonymous, low-volume use.
// https://api.openverse.org/v1/images/
const ENDPOINT = "https://api.openverse.org/v1/images/";

interface OVImage {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  license: string;
  creator: string;
  foreign_landing_url: string;
}

interface OVResponse {
  results?: OVImage[];
}

export async function searchOpenverse(
  query: string,
  signal?: AbortSignal,
  pageSize = 12,
): Promise<AacResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url =
    `${ENDPOINT}?q=${encodeURIComponent(q)}` +
    `&page_size=${pageSize}` +
    `&mature=false&license_type=all-cc&format=json`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as OVResponse;
    const items = data.results ?? [];
    return items.slice(0, pageSize).map((img, i) => ({
      key: `ov:${img.id}`,
      label: cleanTitle(img.title, q),
      imageUrl: img.thumbnail || img.url,
      source: "openverse" as const,
      score: 50 - i, // preserve API order
      meta: {
        attribution: img.creator,
        license: img.license,
        fullUrl: img.url,
      },
    }));
  } catch {
    return [];
  }
}

function cleanTitle(title: string, query: string) {
  if (!title) return query;
  // Strip anything after a hyphen or "|" (common Openverse suffixes)
  const cleaned = title
    .replace(/[-|].*$/, "")
    .replace(/["']/g, "")
    .trim()
    .toLowerCase();
  if (!cleaned || cleaned.length > 30) return query;
  return cleaned;
}
