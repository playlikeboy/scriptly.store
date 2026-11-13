import { NextRequest, NextResponse } from "next/server";
import { BLOG_POSTS } from "@/lib/blog-data";

// Blog content is static (bundled), so responses are safe to cache at the edge.
const PUBLIC_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  "Access-Control-Allow-Origin": "*",
} as const;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const slug = sp.get("slug");
  const category = sp.get("category")?.toLowerCase();
  const limitNum = Number.parseInt(sp.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitNum) && limitNum >= 0 ? limitNum : undefined;

  try {
    const publicPosts = [];
    for (const post of BLOG_POSTS) {
      if (limit !== undefined && publicPosts.length >= limit) break;
      if (slug && post.slug !== slug) continue;
      if (category && post.category.toLowerCase() !== category) continue;
      publicPosts.push({ ...post, url: `https://scriptly.store/blog/${post.slug}` });
    }

    return NextResponse.json(
      { success: true, count: publicPosts.length, posts: publicPosts },
      { headers: PUBLIC_HEADERS }
    );
  } catch (error) {
    console.error("GET blog.json failed:", error);
    return NextResponse.json(
      { success: false, error: "Server error fetching blog posts." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
