import { BLOG_POSTS } from "@/lib/blog-data";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) {
    return {
      title: "Article Not Found | ScriptlyStore",
    };
  }
  return {
    title: `${post.title} | ScriptlyStore Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.thumbnail }],
      type: "article",
    },
  };
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateFormatter.format(d);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function isSafeHref(href: string) {
  return /^(https?:\/\/|\/|#|mailto:)/i.test(href);
}

/**
 * Inline markdown: escapes HTML first (so `<Image />` in prose renders as text,
 * not as a DOM element), then applies code, bold and link formatting.
 */
function parseInlineStyles(text: string) {
  let html = text;
  // Unescape common characters
  html = html.replace(/\\`/g, "`");
  html = html.replace(/\\\*/g, "*");
  html = html.replace(/\\_/g, "_");

  html = escapeHtml(html);

  // Code spans first so their contents are not further formatted
  const codeSpans: string[] = [];
  html = html.replace(/`(.*?)`/g, (_m, code: string) => {
    codeSpans.push(
      `<code class="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">${code}</code>`
    );
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

  // Markdown links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_m, label: string, href: string) => {
    const decoded = href.replace(/&amp;/g, "&");
    if (!isSafeHref(decoded)) return label;
    const external = /^https?:\/\//i.test(decoded) && !decoded.includes("scriptly.store");
    return `<a href="${href}" class="text-primary underline decoration-primary/40 hover:decoration-primary"${
      external ? ' target="_blank" rel="noopener noreferrer"' : ""
    }>${label}</a>`;
  });

  html = html.replace(/\u0000(\d+)\u0000/g, (_m, idx: string) => codeSpans[Number(idx)]);

  return html;
}

// Parse custom markdown layout simply and correctly line-by-line
function renderContent(markdown: string) {
  const lines = markdown.split("\n");
  const elements: ReactNode[] = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code blocks
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      // skip the closing ```
      i++;
      elements.push(
        <figure key={`code-${i}`} className="my-8 overflow-hidden rounded-xl border border-border bg-card">
          {lang && (
            <figcaption className="border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">
              {lang}
            </figcaption>
          )}
          <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground">
            <code className={lang ? `language-${lang}` : ""}>{codeLines.join("\n")}</code>
          </pre>
        </figure>
      );
      continue;
    }

    // 2. Tables
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const rows = tableLines.map((row) => {
        const cells = row.split("|").map((c) => c.trim());
        if (cells[0] === "") cells.shift();
        if (cells[cells.length - 1] === "") cells.pop();
        return cells;
      });

      const filteredRows = rows.filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)));

      if (filteredRows.length > 0) {
        const headers = filteredRows[0];
        const bodyRows = filteredRows.slice(1);

        elements.push(
          <div key={`table-${i}`} className="my-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-foreground/20">
                  {headers.map((h, idx) => (
                    <th
                      key={idx}
                      scope="col"
                      className="px-3 py-2.5 text-left font-semibold text-foreground first:pl-0"
                      dangerouslySetInnerHTML={{ __html: parseInlineStyles(h) }}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-border">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2.5 align-top text-muted-foreground first:pl-0 tabular"
                        dangerouslySetInnerHTML={{ __html: parseInlineStyles(cell) }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 3. Blockquotes
    if (trimmed.startsWith(">")) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        let bqLine = lines[i].trim().slice(1);
        if (bqLine.startsWith(" ")) bqLine = bqLine.slice(1);
        bqLines.push(bqLine);
        i++;
      }

      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-8 rounded-xl bg-secondary px-5 py-4 font-display text-lg leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: parseInlineStyles(bqLines.join(" ")) }}
        />
      );
      continue;
    }

    // 4. Lists (unordered & ordered)
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);

    if (ulMatch) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const match = lines[i].trim().match(/^[-*]\s+(.*)/);
        if (!match) break;
        listItems.push(match[1]);
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-5 list-disc space-y-2 pl-5 marker:text-muted-foreground">
          {listItems.map((item, idx) => (
            <li key={idx} className="pl-1" dangerouslySetInnerHTML={{ __html: parseInlineStyles(item) }} />
          ))}
        </ul>
      );
      continue;
    }

    if (olMatch) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const match = lines[i].trim().match(/^(\d+)\.\s+(.*)/);
        if (!match) break;
        listItems.push(match[2]);
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-5 list-decimal space-y-2 pl-5 marker:text-muted-foreground marker:tabular-nums">
          {listItems.map((item, idx) => (
            <li key={idx} className="pl-1" dangerouslySetInnerHTML={{ __html: parseInlineStyles(item) }} />
          ))}
        </ol>
      );
      continue;
    }

    // 5. Horizontal rules
    if (trimmed === "---") {
      elements.push(<hr key={`hr-${i}`} className="my-12 border-t border-border" />);
      i++;
      continue;
    }

    // 6. Headings (article H1 is the page title, so markdown headings start at h2)
    if (trimmed.startsWith("#### ")) {
      const text = trimmed.replace("#### ", "");
      elements.push(
        <h4 key={`h4-${i}`} className="mt-8 mb-2 text-base font-semibold text-foreground"
          dangerouslySetInnerHTML={{ __html: parseInlineStyles(text) }} />
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      const text = trimmed.replace("### ", "");
      elements.push(
        <h3 key={`h3-${i}`} id={slugify(text)} className="mt-10 mb-3 scroll-mt-24 text-lg font-semibold text-foreground"
          dangerouslySetInnerHTML={{ __html: parseInlineStyles(text) }} />
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      const text = trimmed.replace(/^#{1,2} /, "");
      elements.push(
        <h2 key={`h2-${i}`} id={slugify(text)} className="mt-14 mb-4 scroll-mt-24 font-display text-2xl md:text-[1.75rem] leading-tight text-foreground"
          dangerouslySetInnerHTML={{ __html: parseInlineStyles(text) }} />
      );
      i++;
      continue;
    }

    // 7. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 8. Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-5" dangerouslySetInnerHTML={{ __html: parseInlineStyles(trimmed) }} />
    );
    i++;
  }

  return elements;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) {
    notFound();
  }

  const morePosts = BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);

  return (
    <div className="bg-background text-foreground">
      {/* BlogPosting JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "image": [post.thumbnail],
            "datePublished": post.createdAt,
            "dateModified": post.createdAt,
            "author": {
              "@type": "Person",
              "name": post.author.name,
              "jobTitle": post.author.role,
              "description": post.author.bio,
              "url": post.author.github || post.author.twitter || "https://scriptly.store/about"
            },
            "publisher": {
              "@type": "Organization",
              "name": "ScriptlyStore",
              "logo": {
                "@type": "ImageObject",
                "url": "https://scriptly.store/logo.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://scriptly.store/blog/${post.slug}`
            }
          })
        }}
      />
      {/* BreadcrumbList JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://scriptly.store/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://scriptly.store/blog"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": post.title,
                "item": `https://scriptly.store/blog/${post.slug}`
              }
            ]
          })
        }}
      />

      <article className="px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:pt-14 md:pb-24">
        <header className="mx-auto max-w-[68ch]">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/blog" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden="true" /> Blog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={{ pathname: "/blog", query: { category: post.category.toLowerCase() } }}
                  className="hover:text-foreground transition-colors"
                >
                  {post.category}
                </Link>
              </li>
            </ol>
          </nav>

          <h1 className="mt-8 font-display text-3xl md:text-5xl leading-[1.1] text-foreground">
            {post.title}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
            <span>
              By <span className="text-foreground">{post.author.name}</span>
              {post.author.role && <>, {post.author.role}</>}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readTime}</span>
          </div>
        </header>

        <figure className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl bg-muted">
          <img
            src={post.thumbnail}
            alt=""
            width={1600}
            height={685}
            decoding="async"
            fetchPriority="high"
            className="aspect-[21/9] w-full object-cover"
          />
        </figure>

        {/* Body */}
        <div className="mx-auto mt-12 max-w-[68ch] text-[1.0625rem] leading-[1.75] text-foreground/85 [&_strong]:text-foreground">
          {renderContent(post.content)}
        </div>

        {/* Author */}
        <footer className="mx-auto mt-16 max-w-[68ch] border-t border-border pt-8">
          <h2 className="text-sm font-medium text-muted-foreground">
            {post.author.bio ? "About the author" : "About the team"}
          </h2>
          <p className="mt-2 text-base font-semibold text-foreground">
            {post.author.name}
            {post.author.role && <span className="font-normal text-muted-foreground"> — {post.author.role}</span>}
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {post.author.bio || `The ${post.author.name} is a group of passionate software developers, templates designers, and technical writers specializing in modern framework architectures, database scaling, prompt engineering, and SaaS growth frameworks.`}
          </p>
          {(post.author.github || post.author.twitter) && (
            <div className="mt-3 flex gap-5 text-sm">
              {post.author.github && (
                <a href={post.author.github} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  GitHub profile
                </a>
              )}
              {post.author.twitter && (
                <a href={post.author.twitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Twitter / X
                </a>
              )}
            </div>
          )}
        </footer>
      </article>

      {morePosts.length > 0 && (
        <section aria-labelledby="more-heading" className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
            <div className="mb-8 flex items-baseline justify-between gap-4">
              <h2 id="more-heading" className="font-display text-2xl text-foreground">Keep reading</h2>
              <Link href="/blog" className="text-sm text-primary hover:underline">All articles</Link>
            </div>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {morePosts.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="group block rounded-2xl focus-visible:outline-offset-4">
                    <div className="overflow-hidden rounded-2xl bg-muted">
                      <img
                        src={p.thumbnail}
                        alt=""
                        width={600}
                        height={375}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[16/10] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">{p.category} · {p.readTime}</p>
                    <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2">
                      {p.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
