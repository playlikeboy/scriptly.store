import * as dotenv from "dotenv";
dotenv.config();
import sitemap from "@/app/sitemap";

async function main() {
  console.log("Fetching sitemap URLs...");
  try {
    const sitemapEntries = await sitemap();
    const urls = sitemapEntries.map((entry) => entry.url);
    console.log(`Found ${urls.length} URLs in sitemap.`);

    const payload = {
      host: "scriptly.store",
      key: "ba3534d2bbb246e2847d79cf7ec63a10",
      keyLocation: "https://scriptly.store/ba3534d2bbb246e2847d79cf7ec63a10.txt",
      urlList: urls,
    };

    const endpoints = [
      { name: "IndexNow Protocol", url: "https://api.indexnow.org/indexnow" },
      { name: "Bing Direct", url: "https://www.bing.com/indexnow" },
    ];

    for (const ep of endpoints) {
      console.log(`\nSubmitting ${urls.length} URLs to ${ep.name} (${ep.url})...`);
      try {
        const response = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(payload),
        });

        const text = await response.text();
        if (response.ok) {
          console.log(`✓ Successfully submitted to ${ep.name}! Status: ${response.status} ${response.statusText}`);
          if (text) console.log(`  Response: ${text}`);
        } else {
          console.error(`✗ ${ep.name} submission failed: Status ${response.status}. Response: ${text}`);
        }
      } catch (err) {
        console.error(`✗ Error connecting to ${ep.name}:`, err);
      }
    }
  } catch (error) {
    console.error("Error executing IndexNow script:", error);
  }
  process.exit(0);
}

main();
