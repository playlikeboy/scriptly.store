"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { registerAffiliateAction } from "@/lib/actions/affiliates";
import { Button } from "@/components/ui/button";
import {
  errorTextClass,
  fieldClass,
  hintClass,
  labelClass,
  textareaClass,
} from "@/components/creator/console-ui";
import { cn } from "@/lib/utils";

const MAX_CHANNELS = 1000;

type Errors = { slug?: string; channels?: string; form?: string };

/**
 * Affiliate application form. The surrounding landing / status copy is rendered
 * on the server in page.tsx; only the interactive form ships to the client.
 */
export default function AffiliateOnboardingClient({
  initialSlug,
  isLoggedIn,
  mode = "apply",
}: {
  initialSlug: string;
  isLoggedIn: boolean;
  mode?: "apply" | "reapply";
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const [channels, setChannels] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isPending, startTransition] = useTransition();

  const validate = (): Errors => {
    const e: Errors = {};
    if (!/^[a-z0-9_-]{3,20}$/.test(slug)) e.slug = "Use 3–20 lowercase letters, numbers, hyphens or underscores.";
    if (!channels.trim()) e.channels = "Tell us where you’ll share your links.";
    else if (channels.length > MAX_CHANNELS) e.channels = `Keep this under ${MAX_CHANNELS} characters.`;
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    startTransition(async () => {
      try {
        const res = await registerAffiliateAction({ slug, channels });
        if (res?.success) {
          toast.success("Application submitted. We’ll email you once it’s reviewed.");
          router.refresh();
        } else {
          setErrors({ form: "Could not submit your application. Try again." });
        }
      } catch (err) {
        setErrors({
          form: err instanceof Error && err.message ? err.message : "Could not submit your application. Try again.",
        });
      }
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="space-y-4 p-5 sm:p-8">
        <p className="text-sm text-muted-foreground">
          Sign in with your Scriptly account to choose a referral handle and apply. It takes about a minute.
        </p>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/handler/sign-in?redirectTo=/affiliate">
            Sign in to apply <ArrowRight strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5 sm:p-8">
      <div className="space-y-1.5">
        <label htmlFor="aff-slug" className={labelClass}>
          Referral handle
        </label>
        <div
          className={cn(
            "flex h-10 overflow-hidden rounded-[10px] border border-input bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            errors.slug && "border-destructive"
          )}
        >
          <span className="hidden items-center border-r border-border bg-secondary px-3 font-mono text-xs text-muted-foreground select-none min-[400px]:flex">
            ?ref=
          </span>
          <input
            id="aff-slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
              if (errors.slug) setErrors((p) => ({ ...p, slug: undefined }));
            }}
            placeholder="yourname"
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? "aff-slug-error" : "aff-slug-hint"}
            className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {errors.slug ? (
          <p id="aff-slug-error" className={errorTextClass}>{errors.slug}</p>
        ) : (
          <p id="aff-slug-hint" className={hintClass}>
            Your links will look like scriptly.store/?ref=<span className="font-mono text-foreground">{slug || "yourname"}</span>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="aff-channels" className={labelClass}>
            {mode === "reapply" ? "Updated promotional channels" : "Where you’ll promote"}
          </label>
          <span className={cn("tabular text-xs", channels.length > MAX_CHANNELS ? "text-destructive" : "text-muted-foreground")}>
            {channels.length}/{MAX_CHANNELS}
          </span>
        </div>
        <textarea
          id="aff-channels"
          value={channels}
          onChange={(e) => {
            setChannels(e.target.value);
            if (errors.channels) setErrors((p) => ({ ...p, channels: undefined }));
          }}
          rows={4}
          placeholder="Links to your X profile, blog, YouTube channel or newsletter"
          aria-invalid={Boolean(errors.channels)}
          aria-describedby={errors.channels ? "aff-channels-error" : "aff-channels-hint"}
          className={cn(textareaClass, "min-h-28")}
        />
        {errors.channels ? (
          <p id="aff-channels-error" className={errorTextClass}>{errors.channels}</p>
        ) : (
          <p id="aff-channels-hint" className={hintClass}>
            We review channels for developer-focused content.
          </p>
        )}
      </div>

      {errors.form ? (
        <p role="alert" className="rounded-[10px] bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.form}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? <Loader2 className="animate-spin" /> : null}
        {isPending ? "Submitting…" : mode === "reapply" ? "Re-apply" : "Apply for affiliate access"}
      </Button>
    </form>
  );
}
