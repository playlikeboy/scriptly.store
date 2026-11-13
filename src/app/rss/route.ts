import { db } from "@/db";
import { products } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { BLOG_POSTS } from "@/lib/blog-data";

const BASE_URL = "https://scriptly.store";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeCdata(unsafe: string): string {
  // CDATA section cannot contain the string "]]>"
  return unsafe.replace(/]]>/g, "]]&gt;");
}

interface FeedItem {
  title: string;
  path: string;
  date: Date;
  description: string;
}

function renderItem(item: FeedItem) {
  const url = `${BASE_URL}${escapeXml(item.path)}`;
  const pubDate = Number.isNaN(item.date.getTime()) ? new Date() : item.date;
  return `
    <item>
      <title><![CDATA[${escapeCdata(item.title)}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate.toUTCString()}</pubDate>
      <description><![CDATA[${escapeCdata(item.description)}]]></description>
    </item>`;
}

export async function GET() {
  // Only moderated, published products; select just the columns the feed needs.
  const latestProducts = await db
    .select({
      title: products.title,
      slug: products.slug,
      createdAt: products.createdAt,
      shortDescription: products.shortDescription,
    })
    .from(products)
    .where(and(eq(products.published, true), eq(products.status, "approved")))
    .orderBy(desc(products.createdAt))
    .limit(20);

  const items: FeedItem[] = [
    ...latestProducts.map((p) => ({
      title: p.title,
      path: `/products/${encodeURIComponent(p.slug)}`,
      date: new Date(p.createdAt),
      description: p.shortDescription || "",
    })),
    ...BLOG_POSTS.map((post) => ({
      title: post.title,
      path: `/blog/${encodeURIComponent(post.slug)}`,
      date: new Date(post.createdAt),
      description: post.excerpt,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>ScriptlyStore - Premium Digital Assets &amp; Developer Blog</title>
  <link>${BASE_URL}</link>
  <description>The latest premium developer assets and actionable blogs from ScriptlyStore</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${BASE_URL}/rss" rel="self" type="application/rss+xml" />
  ${items.map(renderItem).join("")}
</channel>
</rss>`;

  return new Response(rssFeed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
