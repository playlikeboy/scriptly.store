"use server";

import { getOrCreateDbUser } from "@/lib/auth-utils";

// Cloudflare Workers cap request bodies at 100MB; stay safely below that.
const MAX_RELEASE_UPLOAD_BYTES = 95 * 1024 * 1024;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Builds a safe, unique asset name: no directory separators or traversal. */
function buildSafeFileName(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() || "file";
  const lastDot = base.lastIndexOf(".");
  const rawName = lastDot > 0 ? base.slice(0, lastDot) : base;
  const rawExt = lastDot > 0 ? base.slice(lastDot + 1) : "";
  const name = rawName.replace(/[^a-zA-Z0-9\-_]/g, "_").slice(0, 80) || "file";
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase();
  return `${name}-${randomHex(8)}${ext ? `.${ext}` : ""}`;
}

export async function uploadToGithubReleaseAction(formData: FormData) {
  try {
    const user = await getOrCreateDbUser();
    if (!user) {
      return { error: "Unauthorized: Sign in required." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "No file provided" };
    }
    if (file.size > MAX_RELEASE_UPLOAD_BYTES) {
      return { error: "File is too large (max 95MB)." };
    }

    const githubPat = process.env.GITHUB_PAT;
    const githubRepoOwner = process.env.GITHUB_REPO_OWNER || "30tools";
    const githubRepoName = process.env.GITHUB_REPO_NAME || "scriptly-assets";

    if (!githubPat) {
      return { error: "GitHub PAT token is not configured on the server." };
    }

    const headers = {
      Authorization: `Bearer ${githubPat}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ScriptlyStore",
    };

    // 1. Get or create the "assets" release.
    const releasesUrl = `https://api.github.com/repos/${githubRepoOwner}/${githubRepoName}/releases`;
    const findRes = await fetch(`${releasesUrl}/tags/assets`, { headers });

    let releaseId: number;
    if (findRes.status === 200) {
      releaseId = ((await findRes.json()) as { id: number }).id;
    } else {
      const createRes = await fetch(releasesUrl, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          tag_name: "assets",
          name: "Scriptly Asset Store",
          body: "Storage for large files, thumbnails, and packages uploaded via ScriptlyStore Admin.",
          draft: false,
          prerelease: false,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("GitHub release create failed:", createRes.status, errText.slice(0, 500));
        return { error: `Failed to create GitHub release tag 'assets' (${createRes.status}).` };
      }
      releaseId = ((await createRes.json()) as { id: number }).id;
    }

    // 2. Upload the file as a release asset.
    const body = await file.arrayBuffer();
    const filename = buildSafeFileName(file.name);
    const uploadUrl = `https://uploads.github.com/repos/${githubRepoOwner}/${githubRepoName}/releases/${releaseId}/assets?name=${encodeURIComponent(filename)}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": body.byteLength.toString(),
      },
      body,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("GitHub asset upload failed:", uploadRes.status, errText.slice(0, 500));
      return { error: `GitHub asset upload failed (${uploadRes.status}).` };
    }

    const assetData = (await uploadRes.json()) as { browser_download_url: string };
    return { url: assetData.browser_download_url };
  } catch (error) {
    console.error("GitHub Release Upload error:", error);
    return { error: "Release upload failed" };
  }
}
