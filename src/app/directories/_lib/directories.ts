import { cache } from "react";

export interface Directory {
  id: number;
  name: string;
  description: string;
  submission_link: string;
}

const SOURCE_URL =
  "https://cdn.jsdelivr.net/gh/theshubh77/awesome-saas-directories@master/launchdb.json";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isDirectory(value: unknown): value is Directory {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && typeof v.submission_link === "string";
}

/**
 * Fetches the directory registry via jsDelivr (24h cache). Deduplicated per
 * request with React cache so metadata + page share one fetch. Returns null
 * on network / parse failure so pages can render an error state.
 */
export const getDirectories = cache(async (): Promise<Directory[] | null> => {
  try {
    const res = await fetch(SOURCE_URL, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`Directory registry responded ${res.status}`);
    const data: unknown = await res.json();
    if (!Array.isArray(data)) throw new Error("Directory registry is not an array");
    return data.filter(isDirectory).map((d) => ({
      ...d,
      description: typeof d.description === "string" ? d.description : "",
    }));
  } catch (err) {
    console.error("Error fetching directory registry:", err);
    return null;
  }
});

export async function getDirectoryBySlug(slug: string): Promise<Directory | null> {
  const directories = await getDirectories();
  return directories?.find((dir) => slugify(dir.name) === slug) ?? null;
}

/** Only allow http(s) outbound links from third-party data. */
export function safeExternalUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
