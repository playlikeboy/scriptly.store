"use server";

import sitemap from "@/app/sitemap";
import { isAdmin } from "@/lib/auth-utils";

const INDEXNOW_HOST = "scriptly.store";
const INDEXNOW_KEY = "ba3534d2bbb246e2847d79cf7ec63a10";
const INDEXNOW_KEY_LOCATION = `https://scriptly.store/${INDEXNOW_KEY}.txt`;
// IndexNow accepts at most 10,000 URLs per request.
const INDEXNOW_BATCH_SIZE = 10_000;

const ENDPOINTS = [
  { name: "IndexNow", url: "https://api.indexnow.org/indexnow" },
  { name: "Bing", url: "https://www.bing.com/indexnow" },
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function getSitemapUrlsAction() {
  try {
    const sitemapEntries = await sitemap();
    return { success: true, urls: sitemapEntries.map((e) => e.url) };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Failed to retrieve sitemap URLs") };
  }
}

export async function submitUrlsToIndexNowAction() {
  try {
    // Pinging search engines spends the site's IndexNow quota: admins only.
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized: Admin access required." };
    }

    const sitemapEntries = await sitemap();
    const urls = sitemapEntries.map((entry) => entry.url);

    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += INDEXNOW_BATCH_SIZE) {
      batches.push(urls.slice(i, i + INDEXNOW_BATCH_SIZE));
    }

    const results = await Promise.all(
      ENDPOINTS.map(async (ep) => {
        try {
          let lastStatus = 200;
          let lastText = "";
          for (const urlList of batches) {
            const response = await fetch(ep.url, {
              method: "POST",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body: JSON.stringify({
                host: INDEXNOW_HOST,
                key: INDEXNOW_KEY,
                keyLocation: INDEXNOW_KEY_LOCATION,
                urlList,
              }),
            });
            lastStatus = response.status;
            lastText = await response.text();
            if (!response.ok) {
              return { name: ep.name, status: response.status, ok: false, message: lastText || "Failed" };
            }
          }
          return { name: ep.name, status: lastStatus, ok: true, message: lastText || "OK" };
        } catch (err) {
          return {
            name: ep.name,
            status: 500,
            ok: false,
            message: errorMessage(err, "Failed to reach endpoint"),
          };
        }
      })
    );

    const allOk = results.every((r) => r.ok);
    const summary = results.map((r) => `${r.name}: ${r.status} ${r.ok ? "Success" : "Failed"}`).join(" | ");

    if (!allOk) {
      return {
        success: false,
        error: `Partial submission failure: ${summary}`,
        results,
        count: urls.length,
      };
    }

    return {
      success: true,
      count: urls.length,
      summary,
      results,
      urls,
    };
  } catch (error) {
    return { success: false, error: errorMessage(error, "Network error submitting to IndexNow and Bing") };
  }
}
