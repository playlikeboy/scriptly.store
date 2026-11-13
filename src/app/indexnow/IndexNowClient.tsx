"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, RefreshCw, Send } from "lucide-react";
import { getSitemapUrlsAction, submitUrlsToIndexNowAction } from "@/lib/actions/indexnow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INDEXNOW_HOST = "scriptly.store";
const INDEXNOW_KEY = "ba3534d2bbb246e2847d79cf7ec63a10";
const KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

export default function IndexNowClient({
  initialUrls = [],
  initialError = null,
}: {
  initialUrls?: string[];
  initialError?: string | null;
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [errorUrls, setErrorUrls] = useState<string | null>(initialError);
  const [isReloading, startReload] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadUrls = () => {
    startReload(async () => {
      setErrorUrls(null);
      const res = await getSitemapUrlsAction();
      if (res.success && res.urls) setUrls(res.urls);
      else setErrorUrls(res.error || "Failed to load URLs.");
    });
  };

  const handleSubmit = () => {
    setResult(null);
    startSubmit(async () => {
      const res = await submitUrlsToIndexNowAction();
      if (res.success) {
        setResult({
          success: true,
          message: `Submitted ${res.count} URLs.${res.summary ? ` ${res.summary}` : ""}`,
        });
      } else {
        setResult({ success: false, message: res.error || "An error occurred during submission." });
      }
    });
  };

  const busy = isReloading || isSubmitting;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-3xl text-balance text-foreground md:text-4xl">IndexNow & Bing console</h1>
        <p className="mt-2 max-w-2xl text-sm text-pretty text-muted-foreground">
          Notify search engines like Microsoft Bing, Yandex and Seznam whenever pages change on{" "}
          <span className="text-foreground">{INDEXNOW_HOST}</span>.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-labelledby="indexnow-config" className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-20">
          <h2 id="indexnow-config" className="text-sm font-semibold text-foreground">
            Configuration
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Target host</dt>
              <dd className="mt-0.5 font-mono text-[13px] text-foreground">{INDEXNOW_HOST}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Verification key</dt>
              <dd className="mt-0.5 font-mono text-[13px] break-all text-foreground">{INDEXNOW_KEY}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Key location</dt>
              <dd className="mt-0.5">
                <a
                  href={KEY_LOCATION}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 font-mono text-[13px] text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
                >
                  <span className="truncate">{KEY_LOCATION}</span>
                  <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                </a>
              </dd>
            </div>
          </dl>

          <Button type="button" onClick={handleSubmit} disabled={busy || urls.length === 0} className="mt-5 w-full">
            {isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
            {isSubmitting ? "Submitting…" : `Submit ${urls.length.toLocaleString("en-IN")} URLs`}
          </Button>

          <div aria-live="polite">
            {result ? (
              <div className={cn("mt-4 flex items-start gap-2 text-sm", result.success ? "text-success" : "text-destructive")}>
                {result.success ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{result.success ? "Submitted" : "Submission failed"}</p>
                  <p className="mt-0.5 break-words text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="indexnow-queue" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <h2 id="indexnow-queue" className="text-sm font-semibold text-foreground">
              Sitemap URLs <span className="font-normal text-muted-foreground tabular-nums">{urls.length.toLocaleString("en-IN")}</span>
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={loadUrls} disabled={busy}>
              <RefreshCw aria-hidden="true" className={cn(isReloading && "animate-spin")} />
              Reload
            </Button>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {isReloading && urls.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Reading sitemap
              </div>
            ) : errorUrls ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <AlertTriangle aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-destructive" />
                <p className="text-sm font-medium text-foreground">Couldn’t read the sitemap</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">{errorUrls}</p>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={loadUrls} disabled={busy}>
                  Retry
                </Button>
              </div>
            ) : urls.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <FileText aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No URLs to submit</p>
                <p className="mt-1 text-sm text-muted-foreground">The sitemap returned no catalog URLs.</p>
              </div>
            ) : (
              <ul className={cn("divide-y divide-border", isReloading && "opacity-60")}>
                {urls.map((url) => (
                  <li key={url} className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-secondary/40 sm:px-5">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{url}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${url}`}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
