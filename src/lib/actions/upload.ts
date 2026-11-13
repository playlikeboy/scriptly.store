"use server";

import { getOrCreateDbUser } from "@/lib/auth-utils";

// GitHub Contents API stores files in git; keep uploads modest (the client
// already routes files > 15MB to the release uploader).
const MAX_CONTENTS_UPLOAD_BYTES = 25 * 1024 * 1024;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Builds a safe, unique repo path: no directory separators or traversal. */
function buildSafeFileName(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() || "file";
  const lastDot = base.lastIndexOf(".");
  const rawName = lastDot > 0 ? base.slice(0, lastDot) : base;
  const rawExt = lastDot > 0 ? base.slice(lastDot + 1) : "";
  const name = rawName.replace(/[^a-zA-Z0-9\-_]/g, "_").slice(0, 80) || "file";
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase();
  return `${name}-${randomHex(8)}${ext ? `.${ext}` : ""}`;
}

export async function uploadImageAction(formData: FormData) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return { error: "Unauthorized: Sign in required." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "No file provided" };
    }
    if (file.size > MAX_CONTENTS_UPLOAD_BYTES) {
      return { error: "File is too large for standard upload (max 25MB)." };
    }

    const githubPat = process.env.GITHUB_PAT;
    const githubRepoOwner = process.env.GITHUB_REPO_OWNER || "30tools";
    const githubRepoName = process.env.GITHUB_REPO_NAME || "scriptly-assets";

    if (!githubPat) {
      return { error: "GitHub PAT token is not configured on the server." };
    }

    const base64Content = Buffer.from(await file.arrayBuffer()).toString("base64");
    const path = buildSafeFileName(file.name);
    const url = `https://api.github.com/repos/${githubRepoOwner}/${githubRepoName}/contents/${encodeURIComponent(path)}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ScriptlyStore",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload product image: ${path}`,
        content: base64Content,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub upload failed response:", response.status, errorText.slice(0, 500));
      return { error: `GitHub API error (${response.status}). Please try again.` };
    }

    const result = (await response.json()) as {
      content: { sha: string; path: string };
      commit: { sha: string };
    };

    const cdnUrl = `https://cdn.jsdelivr.net/gh/${githubRepoOwner}/${githubRepoName}@${result.commit.sha}/${path}`;

    return {
      url: cdnUrl,
      public_id: result.content.sha,
    };
  } catch (error) {
    console.error("Upload action error:", error);
    return { error: "Upload failed" };
  }
}
