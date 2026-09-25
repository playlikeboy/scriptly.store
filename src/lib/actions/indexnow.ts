"use server";

import sitemap from "@/app/sitemap";

export async function getSitemapUrlsAction() {
  try {
    const sitemapEntries = await sitemap();
    return { success: true, urls: sitemapEntries.map((e) => e.url) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to retrieve sitemap URLs" };
  }
}

export async function submitUrlsToIndexNowAction() {
  try {
    const sitemapEntries = await sitemap();
    const urls = sitemapEntries.map((entry) => entry.url);
    
    const payload = {
      host: "scriptly.store",
      key: "ba3534d2bbb246e2847d79cf7ec63a10",
      keyLocation: "https://scriptly.store/ba3534d2bbb246e2847d79cf7ec63a10.txt",
      urlList: urls,
    };

    const endpoints = [
      { name: "IndexNow", url: "https://api.indexnow.org/indexnow" },
      { name: "Bing", url: "https://www.bing.com/indexnow" },
    ];

    const results = await Promise.all(
      endpoints.map(async (ep) => {
        try {
          const response = await fetch(ep.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(payload),
          });
          const text = await response.text();
          return {
            name: ep.name,
            status: response.status,
            ok: response.ok,
            message: text || "OK",
          };
        } catch (err: any) {
          return {
            name: ep.name,
            status: 500,
            ok: false,
            message: err.message || "Failed to reach endpoint",
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
  } catch (error: any) {
    return { success: false, error: error.message || "Network error submitting to IndexNow and Bing" };
  }
}
