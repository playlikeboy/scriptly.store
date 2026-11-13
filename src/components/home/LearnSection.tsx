import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog-data";

interface LearnSectionProps {
  posts: BlogPost[];
}

export default function LearnSection({ posts = [] }: LearnSectionProps) {
  const displayPosts = posts.slice(0, 3);
  if (displayPosts.length === 0) return null;

  return (
    <section aria-labelledby="home-learn-title">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2
              id="home-learn-title"
              className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground md:text-4xl"
            >
              Learn to ship
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Practical guides on micro-SaaS architecture, monetization and shipping side projects.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
          >
            All guides
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-3">
          {displayPosts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-secondary">
                  {post.thumbnail && (
                    <Image
                      src={post.thumbnail}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {post.category} · {post.readTime}
                </p>
                <h3 className="mt-1.5 font-display text-xl leading-snug font-medium text-foreground transition-colors group-hover:text-primary">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
