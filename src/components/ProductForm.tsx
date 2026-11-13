"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Info, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import { uploadImageAction } from "@/lib/actions/upload";
import { uploadToGithubReleaseAction } from "@/lib/actions/github-releases";
import { formatMoney } from "@/lib/price-utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  errorTextClass,
  fieldClass,
  hintClass,
  labelClass,
  selectClass,
  textareaClass,
} from "@/components/creator/console-ui";
import { cn } from "@/lib/utils";

// react-tweet is only needed when a creator pastes an X/Twitter link; keep it out of the main bundle.
const Tweet = dynamic(() => import("react-tweet").then((m) => m.Tweet), {
  ssr: false,
  loading: () => <p className="text-xs text-muted-foreground">Loading post preview…</p>,
});

interface ProductFormProps {
  categories: { id: string; name: string; slug: string }[];
  subcategories: { id: string; name: string; slug: string; categoryId: string }[];
  isCreatorConsole?: boolean;
  initialData?: {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string;
    category: string;
    subcategory: string | null;
    tags: string | null;
    thumbnail: string | null;
    previewGif: string | null;
    screenshots: string | null;
    videoUrl: string | null;
    fileUrl: string | null;
    demoUrl: string | null;
    price: number; // in paise
    version: string;
    featured: boolean;
    published: boolean;
    isFree?: boolean;
    discountPercent?: number;
    promoStart?: Date | string | null;
    promoEnd?: Date | string | null;
    redirectDownload?: boolean;
    personal?: boolean;
    views?: number;
    downloadsCount?: number;
    saves?: number;
    showStats?: boolean;
    affiliateCommissionPercent?: number;
  };
}

type Values = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string;
  price: string;
  version: string;
  demoUrl: string;
  featured: boolean;
  published: boolean;
  personal: boolean;
  showStats: boolean;
  views: string;
  downloadsCount: string;
  saves: string;
  isFree: boolean;
  discountPercent: string;
  affiliateCommissionPercent: string;
  promoStart: string;
  promoEnd: string;
  thumbnailUrl: string;
  previewGif: string;
  screenshots: string;
  videoUrl: string;
  fileUrl: string;
  redirectDownload: boolean;
};

type FieldKey = keyof Values;
type Errors = Partial<Record<FieldKey, string>>;

const DRAFT_KEY = "scriptlystore_new_product_draft";
const SUGGESTED_TAGS = ["nextjs", "tailwindcss", "typescript", "react", "saas", "boilerplate", "api", "cloudflare-worker", "ebook"];

/** Platform keeps 5%; affiliate commission comes out of the creator's 95% (see orders.ts). */
const CREATOR_SPLIT = 0.95;

function formatDateForInput(dateVal: Date | string | null | undefined) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const slugify = (val: string) =>
  val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function getEmbedUrl(url: string) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const dm = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([^&\s?]+)/);
  if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;
  if (url.includes("embed") || url.includes("player")) return url;
  return null;
}

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/* ---------- small presentational helpers ---------- */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <h2 id={`${id}-title`} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function FieldShell({
  id,
  label,
  required,
  optional,
  hint,
  error,
  aside,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {label}
          {required ? (
            <span aria-hidden className="text-primary">
              {" "}*
            </span>
          ) : null}
          {optional ? <span className="font-normal text-muted-foreground"> optional</span> : null}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className={errorTextClass}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function LengthMeter({ length, min, max }: { length: number; min: number; max: number }) {
  const tone =
    length === 0 ? "text-muted-foreground" : length < min ? "text-muted-foreground" : length <= max ? "text-success" : "text-destructive";
  const note = length === 0 ? "" : length < min ? " · short" : length <= max ? " · good for search" : " · may be cut off";
  return (
    <span className={cn("tabular text-xs", tone)}>
      {length}/{max}
      {note}
    </span>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className={cn(labelClass, "cursor-pointer")}>
          {label}
        </label>
        <p id={`${id}-desc`} className="mt-0.5 text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={`${id}-desc`}
        className="mt-0.5"
      />
    </div>
  );
}

function UploadButton({
  label,
  accept,
  multiple,
  busy,
  disabled,
  onFiles,
  full,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  busy: boolean;
  disabled?: boolean;
  onFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  full?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/25 hover:bg-secondary focus-within:ring-2 focus-within:ring-ring",
        full && "w-full",
        (busy || disabled) && "pointer-events-none opacity-60"
      )}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={busy || disabled}
        onChange={(e) => {
          onFiles(e);
          e.target.value = "";
        }}
        className="sr-only"
      />
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" strokeWidth={1.75} />}
      <span className={full ? "" : "sr-only sm:not-sr-only"}>{busy ? "Uploading…" : label}</span>
    </label>
  );
}

/* ---------- main form ---------- */

export default function ProductForm({ categories, subcategories, isCreatorConsole = false, initialData }: ProductFormProps) {
  const isEdit = !!initialData;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [submitMode, setSubmitMode] = useState<"publish" | "draft" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [descTab, setDescTab] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const [v, setV] = useState<Values>(() => ({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    shortDescription: initialData?.shortDescription || "",
    description: initialData?.description || "",
    category: initialData?.category || categories[0]?.slug || "",
    subcategory: initialData?.subcategory || "",
    tags: initialData?.tags || "",
    price: initialData ? String(initialData.price / 100) : "",
    version: initialData?.version || "1.0.0",
    demoUrl: initialData?.demoUrl || "",
    featured: initialData?.featured || false,
    published: initialData ? initialData.published : true,
    personal: initialData?.personal || false,
    showStats: initialData?.showStats || false,
    views: initialData?.views?.toString() || "0",
    downloadsCount: initialData?.downloadsCount?.toString() || "0",
    saves: initialData?.saves?.toString() || "0",
    isFree: initialData?.isFree || false,
    discountPercent: initialData?.discountPercent?.toString() || "0",
    affiliateCommissionPercent: initialData?.affiliateCommissionPercent?.toString() || "30",
    promoStart: formatDateForInput(initialData?.promoStart),
    promoEnd: formatDateForInput(initialData?.promoEnd),
    thumbnailUrl: initialData?.thumbnail || "",
    previewGif: initialData?.previewGif || "",
    screenshots: initialData?.screenshots || "",
    videoUrl: initialData?.videoUrl || "",
    fileUrl: initialData?.fileUrl || "",
    redirectDownload: initialData ? initialData.redirectDownload ?? true : true,
  }));

  const set = <K extends FieldKey>(key: K, value: Values[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /* Draft persistence (new product only). Browser storage can throw in private mode. */
  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const data = JSON.parse(saved) as Partial<Values>;
      setV((prev) => {
        const next = { ...prev };
        (Object.keys(prev) as FieldKey[]).forEach((k) => {
          const val = data[k];
          if (val !== undefined && val !== "" && typeof val === typeof prev[k]) {
            (next as Record<string, unknown>)[k] = val;
          }
        });
        return next;
      });
      setDraftRestored(true);
    } catch {
      /* ignore unreadable drafts */
    }
  }, [isEdit]);

  useEffect(() => {
    if (isEdit) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [isEdit, v]);

  /* Markdown preview: load the parser only when the preview tab is opened. */
  useEffect(() => {
    if (descTab !== "preview") return;
    let cancelled = false;
    import("marked").then(({ marked }) => {
      const html = marked.parse(v.description || "*Nothing written yet.*", { async: false }) as string;
      if (!cancelled) setPreviewHtml(html);
    });
    return () => {
      cancelled = true;
    };
  }, [descTab, v.description]);

  const filteredSubcategories = useMemo(
    () => subcategories.filter((sub) => sub.categoryId === v.category),
    [subcategories, v.category]
  );

  const screenshotList = splitList(v.screenshots);
  const tagList = splitList(v.tags);

  const embedUrl = getEmbedUrl(v.videoUrl);
  const isDirectVideo = /\.(mp4|webm|ogv)(\?.*)?$/i.test(v.videoUrl);
  const tweetId =
    v.videoUrl.includes("twitter.com") || v.videoUrl.includes("x.com")
      ? v.videoUrl.match(/status\/(\d+)/)?.[1] ?? null
      : null;

  /* Earnings preview — mirrors the checkout split in src/lib/actions/orders.ts. */
  const pricing = useMemo(() => {
    const listPaise = Math.round((parseFloat(v.price) || 0) * 100);
    const discount = v.isFree ? 100 : Math.min(Math.max(parseFloat(v.discountPercent) || 0, 0), 100);
    const salePaise = Math.max(listPaise - Math.round(listPaise * (discount / 100)), 0);
    const commission = Math.min(Math.max(parseFloat(v.affiliateCommissionPercent) || 30, 5), 50);
    const platformFee = Math.round(salePaise * (1 - CREATOR_SPLIT));
    const direct = Math.round(salePaise * CREATOR_SPLIT);
    const referred = Math.round(salePaise * Math.max(CREATOR_SPLIT - commission / 100, 0));
    const affiliate = Math.max(salePaise - platformFee - referred, 0);
    return { listPaise, salePaise, discount, commission, platformFee, direct, referred, affiliate };
  }, [v.price, v.discountPercent, v.isFree, v.affiliateCommissionPercent]);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "thumbnailUrl" | "previewGif" | "screenshots" | "videoUrl" | "fileUrl",
    forceRelease = false
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(field);
    setFormError(null);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        let data;
        // Files over 15MB (or forced, e.g. ZIP packages) go through the GitHub Release upload.
        if (forceRelease || file.size > 15 * 1024 * 1024) {
          data = await uploadToGithubReleaseAction(formData);
        } else {
          data = await uploadImageAction(formData);
          if (data && "error" in data) {
            data = await uploadToGithubReleaseAction(formData);
          }
        }

        if (data && "url" in data && data.url) {
          uploadedUrls.push(data.url);
        } else if (data && "error" in data) {
          toast.error(`Upload failed for ${file.name}: ${data.error}`);
        }
      }

      if (uploadedUrls.length > 0) {
        if (field === "screenshots") {
          setV((prev) => ({ ...prev, screenshots: [...splitList(prev.screenshots), ...uploadedUrls].join(", ") }));
        } else {
          set(field, uploadedUrls[0]);
        }
        toast.success(uploadedUrls.length === 1 ? "File uploaded." : `${uploadedUrls.length} files uploaded.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      setFormError(`Upload failed: ${message}`);
      toast.error(`Upload failed: ${message}`);
    } finally {
      setUploading(null);
    }
  };

  const validate = (isDraft: boolean): Errors => {
    const e: Errors = {};
    if (!v.title.trim()) e.title = "Give your product a title.";
    if (!v.slug.trim()) {
      if (!isDraft) e.slug = "Add a URL slug.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)) {
      e.slug = "Use lowercase letters, numbers and single hyphens.";
    }
    if (!v.category) e.category = "Choose a category.";
    if (!isDraft) {
      if (!v.shortDescription.trim()) e.shortDescription = "Write a one-line summary.";
      if (!v.description.trim()) e.description = "Describe what buyers get.";
      if (!v.fileUrl.trim()) e.fileUrl = "Add the package buyers will download.";
    }
    if (v.fileUrl && !isHttpUrl(v.fileUrl)) e.fileUrl = "Enter a full URL starting with https://";
    if (v.demoUrl && !isHttpUrl(v.demoUrl)) e.demoUrl = "Enter a full URL starting with https://";
    if (v.thumbnailUrl && !isHttpUrl(v.thumbnailUrl) && !v.thumbnailUrl.startsWith("/"))
      e.thumbnailUrl = "Enter an image URL starting with https://";
    const price = parseFloat(v.price);
    if (!v.isFree && !(isDraft && v.price === "")) {
      if (v.price === "" || Number.isNaN(price)) e.price = "Enter a price in US dollars, or make the product free.";
      else if (price < 0) e.price = "Price can’t be negative.";
      else if (price === 0) e.price = "Enter a price above $0, or turn on “Free”.";
    }
    const discount = parseFloat(v.discountPercent || "0");
    if (!v.isFree && (Number.isNaN(discount) || discount < 0 || discount > 100))
      e.discountPercent = "Use a number from 0 to 100.";
    const commission = parseFloat(v.affiliateCommissionPercent);
    if (Number.isNaN(commission) || commission < 5 || commission > 50)
      e.affiliateCommissionPercent = "Use a number from 5 to 50.";
    if (v.promoStart && v.promoEnd && new Date(v.promoEnd) <= new Date(v.promoStart))
      e.promoEnd = "End must be after the start.";
    return e;
  };

  const focusFirstError = (e: Errors) => {
    const first = Object.keys(e)[0];
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`#pf-${first}`);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const submit = (isDraft: boolean) => {
    setFormError(null);
    const nextErrors = validate(isDraft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    const fd = new FormData();
    fd.set("title", v.title.trim());
    fd.set("slug", v.slug.trim());
    fd.set("shortDescription", v.shortDescription.trim());
    fd.set("description", v.description);
    fd.set("category", v.category);
    fd.set("subcategory", v.subcategory);
    fd.set("price", v.isFree ? "0" : v.price);
    fd.set("version", v.version);
    fd.set("tags", tagList.join(", "));
    fd.set("demoUrl", v.demoUrl);
    fd.set("featured", v.featured ? "true" : "false");
    fd.set("published", isDraft ? "false" : v.published ? "true" : "false");
    fd.set("personal", v.personal ? "true" : "false");
    fd.set("thumbnail", v.thumbnailUrl);
    fd.set("previewGif", v.previewGif);
    fd.set("screenshots", v.screenshots);
    fd.set("videoUrl", v.videoUrl);
    fd.set("fileUrl", v.fileUrl);
    fd.set("redirectDownload", v.redirectDownload ? "true" : "false");
    fd.set("isFree", v.isFree ? "true" : "false");
    fd.set("discountPercent", v.isFree ? "0" : v.discountPercent || "0");
    fd.set("promoStart", v.promoStart);
    fd.set("promoEnd", v.promoEnd);
    fd.set("showStats", v.showStats ? "true" : "false");
    fd.set("views", v.views);
    fd.set("downloadsCount", v.downloadsCount);
    fd.set("saves", v.saves);
    fd.set("affiliateCommissionPercent", v.affiliateCommissionPercent);

    setSubmitMode(isDraft ? "draft" : "publish");
    startTransition(async () => {
      try {
        const result =
          isEdit && initialData ? await updateProductAction(initialData.id, fd) : await createProductAction(fd);

        if (result.success) {
          if (!isEdit) {
            try {
              localStorage.removeItem(DRAFT_KEY);
            } catch {
              /* storage unavailable */
            }
          }
          toast.success(
            isEdit
              ? isCreatorConsole
                ? "Changes saved and sent for review."
                : "Product updated."
              : isCreatorConsole
                ? "Submitted for review."
                : "Product created."
          );
          router.push(isCreatorConsole ? "/creator/products" : "/admin/products");
          router.refresh();
        } else {
          setFormError((result as { error?: string }).error || "Could not save this product. Try again.");
        }
      } catch (err) {
        setFormError(err instanceof Error && err.message ? err.message : "Could not save this product. Try again.");
      } finally {
        setSubmitMode(null);
      }
    });
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* storage unavailable */
    }
    window.location.reload();
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/,/g, "");
    if (!tag || tagList.includes(tag)) return;
    set("tags", [...tagList, tag].join(", "));
  };

  const moveScreenshot = (from: number, to: number) => {
    if (to < 0 || to >= screenshotList.length) return;
    const next = [...screenshotList];
    [next[from], next[to]] = [next[to], next[from]];
    set("screenshots", next.join(", "));
  };

  const err = (k: FieldKey) =>
    errors[k]
      ? { "aria-invalid": true as const, "aria-describedby": `pf-${k}-error` }
      : { "aria-describedby": `pf-${k}-hint` };

  const primaryLabel = isEdit
    ? isCreatorConsole
      ? "Save & resubmit"
      : "Save changes"
    : isCreatorConsole
      ? "Submit for review"
      : "Publish product";

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="space-y-6"
    >
      {draftRestored && !isEdit ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-muted-foreground">Restored your unsaved draft from this browser.</p>
          <Button type="button" variant="ghost" size="sm" onClick={discardDraft} className="self-start sm:self-auto">
            Start over
          </Button>
        </div>
      ) : null}

      {isCreatorConsole ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm sm:px-5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-muted-foreground">
            {isEdit
              ? "Saving changes sends this listing back to review. It stays unlisted until a moderator approves it."
              : "Every submission is reviewed by Scriptly moderators before it appears in the marketplace."}{" "}
            Need help packaging?{" "}
            <Link href="/hire-me" className="text-primary underline-offset-4 hover:underline">
              Hire a developer
            </Link>
            .
          </p>
        </div>
      ) : null}

      {formError ? (
        <div role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive sm:px-5">
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-7">
          <Section id="pf-basics" title="Basics" description="What it is and where buyers find it.">
            <FieldShell
              id="pf-title"
              label="Title"
              required
              error={errors.title}
              aside={<LengthMeter length={v.title.length} min={30} max={60} />}
            >
              <input
                id="pf-title"
                type="text"
                value={v.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setV((prev) => ({ ...prev, title, slug: isEdit ? prev.slug : slugify(title) }));
                  setErrors((prev) => ({ ...prev, title: undefined, slug: isEdit ? prev.slug : undefined }));
                }}
                placeholder="Fizzi — 3D ecommerce landing page in Next.js"
                className={fieldClass}
                {...err("title")}
              />
            </FieldShell>

            <FieldShell
              id="pf-slug"
              label="URL slug"
              required
              error={errors.slug}
              hint={
                <>
                  scriptly.store/products/<span className="font-mono text-foreground">{v.slug || "your-product"}</span>
                </>
              }
            >
              <input
                id="pf-slug"
                type="text"
                value={v.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="fizzi-3d-ecommerce-landing-page"
                autoComplete="off"
                spellCheck={false}
                className={cn(fieldClass, "font-mono")}
                {...err("slug")}
              />
            </FieldShell>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldShell id="pf-category" label="Category" required error={errors.category}>
                <select
                  id="pf-category"
                  value={v.category}
                  onChange={(e) => {
                    setV((prev) => ({ ...prev, category: e.target.value, subcategory: "" }));
                    setErrors((prev) => ({ ...prev, category: undefined }));
                  }}
                  className={selectClass}
                  {...err("category")}
                >
                  {categories.length === 0 ? <option value="">No categories available</option> : null}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell id="pf-subcategory" label="Subcategory" optional>
                <select
                  id="pf-subcategory"
                  value={v.subcategory}
                  onChange={(e) => set("subcategory", e.target.value)}
                  disabled={filteredSubcategories.length === 0}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {filteredSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.slug}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </FieldShell>
            </div>

            <FieldShell
              id="pf-shortDescription"
              label="One-line summary"
              required
              error={errors.shortDescription}
              hint="Shown on product cards and in search results."
              aside={<LengthMeter length={v.shortDescription.length} min={50} max={160} />}
            >
              <input
                id="pf-shortDescription"
                type="text"
                value={v.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                placeholder="Production-ready Next.js starter with auth, billing and email."
                className={fieldClass}
                {...err("shortDescription")}
              />
            </FieldShell>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="pf-description" className={labelClass}>
                  Full description<span aria-hidden className="text-primary"> *</span>
                  <span className="font-normal text-muted-foreground"> Markdown</span>
                </label>
                <div role="tablist" aria-label="Description editor" className="inline-flex rounded-[10px] bg-secondary p-0.5">
                  {(["write", "preview"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={descTab === tab}
                      onClick={() => setDescTab(tab)}
                      className={cn(
                        "h-7 rounded-lg px-3 text-[13px] capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        descTab === tab
                          ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              {descTab === "write" ? (
                <textarea
                  id="pf-description"
                  rows={12}
                  value={v.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder={"## What’s included\n- Auth, billing and email wired up\n- Deploy guide\n\n## Requirements\nNode 20+"}
                  className={cn(textareaClass, "min-h-60 font-mono text-[13px]")}
                  {...err("description")}
                />
              ) : (
                <div
                  className="markdown-content min-h-60 overflow-y-auto rounded-[10px] border border-input bg-background px-4 py-3 text-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
              {errors.description ? (
                <p id="pf-description-error" className={errorTextClass}>
                  {errors.description}
                </p>
              ) : (
                <p id="pf-description-hint" className={hintClass}>
                  Cover what’s included, the stack, setup steps and licence.
                </p>
              )}
            </div>
          </Section>

          <Section id="pf-pricing" title="Pricing" description="Prices are in US dollars. Razorpay charges buyers the INR equivalent at checkout.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldShell id="pf-price" label="Price (USD)" required={!v.isFree} error={errors.price}>
                <div className="relative">
                  <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <input
                    id="pf-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={v.isFree ? "0" : v.price}
                    disabled={v.isFree}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="499"
                    className={cn(fieldClass, "tabular pl-7")}
                    {...err("price")}
                  />
                </div>
              </FieldShell>
              <div className="flex items-end pb-1 sm:pb-2.5">
                <SwitchRow
                  id="pf-isFree"
                  label="Free product"
                  description="Buyers download without paying."
                  checked={v.isFree}
                  onCheckedChange={(checked) => {
                    setV((prev) => ({ ...prev, isFree: checked, price: checked ? "0" : prev.price === "0" ? "" : prev.price }));
                    setErrors((prev) => ({ ...prev, price: undefined }));
                  }}
                />
              </div>
            </div>

            {!isCreatorConsole ? (
              <SwitchRow
                id="pf-personal"
                label="First-party product"
                description="List under ScriptlyHQ directly."
                checked={v.personal}
                onCheckedChange={(c) => set("personal", c)}
              />
            ) : null}

            <div className="space-y-4 border-t border-border pt-5">
              <h3 className="text-sm font-medium text-foreground">Promotion</h3>
              <FieldShell
                id="pf-discountPercent"
                label="Discount (%)"
                optional
                error={errors.discountPercent}
                hint="Applied to the price above. Leave at 0 for no discount."
              >
                <input
                  id="pf-discountPercent"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  disabled={v.isFree}
                  value={v.isFree ? "0" : v.discountPercent}
                  onChange={(e) => set("discountPercent", e.target.value)}
                  placeholder="20"
                  className={cn(fieldClass, "tabular sm:max-w-40")}
                  {...err("discountPercent")}
                />
              </FieldShell>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldShell id="pf-promoStart" label="Starts" optional>
                  <input
                    id="pf-promoStart"
                    type="datetime-local"
                    value={v.promoStart}
                    onChange={(e) => set("promoStart", e.target.value)}
                    className={cn(fieldClass, "tabular")}
                  />
                </FieldShell>
                <FieldShell id="pf-promoEnd" label="Ends" optional error={errors.promoEnd}>
                  <input
                    id="pf-promoEnd"
                    type="datetime-local"
                    value={v.promoEnd}
                    min={v.promoStart || undefined}
                    onChange={(e) => set("promoEnd", e.target.value)}
                    className={cn(fieldClass, "tabular")}
                    {...err("promoEnd")}
                  />
                </FieldShell>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-5">
              <FieldShell
                id="pf-affiliateCommissionPercent"
                label="Affiliate commission (%)"
                error={errors.affiliateCommissionPercent}
                hint="Paid to partners who refer a sale, out of your share. 5–50%."
              >
                <input
                  id="pf-affiliateCommissionPercent"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={50}
                  value={v.affiliateCommissionPercent}
                  onChange={(e) => set("affiliateCommissionPercent", e.target.value)}
                  placeholder="30"
                  className={cn(fieldClass, "tabular sm:max-w-40")}
                  {...err("affiliateCommissionPercent")}
                />
              </FieldShell>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-medium text-foreground">What you earn per sale</h3>
              <dl className="mt-3 space-y-2 text-sm" aria-live="polite">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Buyer pays</dt>
                  <dd className="tabular text-foreground">
                    {pricing.salePaise <= 0 ? (
                      <span className="text-success">Free</span>
                    ) : pricing.discount > 0 ? (
                      <>
                        <s className="mr-1.5 text-muted-foreground">{formatMoney(pricing.listPaise)}</s>
                        {formatMoney(pricing.salePaise)}
                      </>
                    ) : (
                      formatMoney(pricing.salePaise)
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Platform fee (5%)</dt>
                  <dd className="tabular text-muted-foreground">−{formatMoney(pricing.platformFee)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
                  <dt className="font-medium text-foreground">You keep · direct sale</dt>
                  <dd className="tabular font-semibold text-foreground">{formatMoney(pricing.direct)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">You keep · affiliate sale ({pricing.commission}% commission)</dt>
                  <dd className="tabular text-foreground">{formatMoney(pricing.referred)}</dd>
                </div>
              </dl>
            </div>
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-5">
          <Section id="pf-files" title="Files & delivery" description="What buyers download after paying.">
            <FieldShell
              id="pf-fileUrl"
              label="Package URL"
              required
              error={errors.fileUrl}
              hint="ZIP, tar or PDF. Uploads are stored as a private GitHub release asset."
            >
              <div className="flex gap-2">
                <input
                  id="pf-fileUrl"
                  type="url"
                  value={v.fileUrl}
                  onChange={(e) => set("fileUrl", e.target.value)}
                  placeholder="https://…/product.zip"
                  className={cn(fieldClass, "font-mono text-[13px]")}
                  {...err("fileUrl")}
                />
                <UploadButton
                  label="Upload"
                  busy={uploading === "fileUrl"}
                  disabled={uploading !== null && uploading !== "fileUrl"}
                  onFiles={(e) => handleUpload(e, "fileUrl", true)}
                />
              </div>
            </FieldShell>

            <SwitchRow
              id="pf-redirectDownload"
              label="Redirect downloads"
              description="Send buyers straight to the package URL instead of streaming it through Scriptly."
              checked={v.redirectDownload}
              onCheckedChange={(c) => set("redirectDownload", c)}
            />

            <FieldShell id="pf-demoUrl" label="Live demo URL" optional error={errors.demoUrl}>
              <input
                id="pf-demoUrl"
                type="url"
                value={v.demoUrl}
                onChange={(e) => set("demoUrl", e.target.value)}
                placeholder="https://demo.example.com"
                className={fieldClass}
                {...err("demoUrl")}
              />
            </FieldShell>
          </Section>

          <Section id="pf-media" title="Media" description="A clear thumbnail and real screenshots sell the product.">
            <FieldShell
              id="pf-thumbnailUrl"
              label="Thumbnail"
              error={errors.thumbnailUrl}
              hint="16:10 works best. JPG, PNG or WebP."
            >
              {v.thumbnailUrl ? (
                 
                <img
                  src={v.thumbnailUrl}
                  alt="Thumbnail preview"
                  width={320}
                  height={200}
                  loading="lazy"
                  decoding="async"
                  className="mb-2 aspect-[16/10] w-full max-w-xs rounded-[10px] bg-secondary object-cover"
                />
              ) : null}
              <div className="flex gap-2">
                <input
                  id="pf-thumbnailUrl"
                  type="url"
                  value={v.thumbnailUrl}
                  onChange={(e) => set("thumbnailUrl", e.target.value)}
                  placeholder="https://…"
                  className={fieldClass}
                  {...err("thumbnailUrl")}
                />
                <UploadButton
                  label="Upload"
                  accept="image/*"
                  busy={uploading === "thumbnailUrl"}
                  disabled={uploading !== null && uploading !== "thumbnailUrl"}
                  onFiles={(e) => handleUpload(e, "thumbnailUrl")}
                />
              </div>
            </FieldShell>

            <FieldShell id="pf-previewGif" label="Hover preview" optional hint="GIF or WebP shown when buyers hover the card.">
              {v.previewGif ? (
                 
                <img
                  src={v.previewGif}
                  alt="Hover preview"
                  width={320}
                  height={200}
                  loading="lazy"
                  decoding="async"
                  className="mb-2 aspect-[16/10] w-full max-w-xs rounded-[10px] bg-secondary object-cover"
                />
              ) : null}
              <div className="flex gap-2">
                <input
                  id="pf-previewGif"
                  type="url"
                  value={v.previewGif}
                  onChange={(e) => set("previewGif", e.target.value)}
                  placeholder="https://…"
                  className={fieldClass}
                  aria-describedby="pf-previewGif-hint"
                />
                <UploadButton
                  label="Upload"
                  accept="image/gif,image/webp"
                  busy={uploading === "previewGif"}
                  disabled={uploading !== null && uploading !== "previewGif"}
                  onFiles={(e) => handleUpload(e, "previewGif")}
                />
              </div>
            </FieldShell>

            <FieldShell
              id="pf-videoUrl"
              label="Video"
              optional
              hint="YouTube, Vimeo, Dailymotion, an X post, or a direct .mp4/.webm file."
            >
              <div className="flex gap-2">
                <input
                  id="pf-videoUrl"
                  type="url"
                  value={v.videoUrl}
                  onChange={(e) => set("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className={fieldClass}
                  aria-describedby="pf-videoUrl-hint"
                />
                <UploadButton
                  label="Upload"
                  accept="video/*"
                  busy={uploading === "videoUrl"}
                  disabled={uploading !== null && uploading !== "videoUrl"}
                  onFiles={(e) => handleUpload(e, "videoUrl", true)}
                />
              </div>
              {v.videoUrl ? (
                <div className="mt-2 flex aspect-video items-center justify-center overflow-hidden rounded-[10px] bg-secondary">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title="Video preview"
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                    />
                  ) : isDirectVideo ? (
                    <video src={v.videoUrl} controls preload="metadata" className="h-full w-full" />
                  ) : tweetId ? (
                    <div className="h-full w-full max-w-[320px] overflow-y-auto">
                      <Tweet id={tweetId} />
                    </div>
                  ) : (
                    <p className="px-4 text-center text-xs text-muted-foreground">
                      No preview for this link. It will still be saved.
                    </p>
                  )}
                </div>
              ) : null}
            </FieldShell>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span id="pf-screenshots-label" className={labelClass}>
                  Screenshots <span className="font-normal text-muted-foreground">optional</span>
                </span>
                <span className="tabular text-xs text-muted-foreground">{screenshotList.length} added</span>
              </div>

              {screenshotList.length > 0 ? (
                <ol aria-labelledby="pf-screenshots-label" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {screenshotList.map((url, idx) => (
                    <li key={`${url}-${idx}`} className="group relative overflow-hidden rounded-[10px] bg-secondary">
                      { }
                      <img
                        src={url}
                        alt={`Screenshot ${idx + 1}`}
                        width={240}
                        height={150}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[16/10] w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-1 border-t border-border bg-card px-1 py-1">
                        <span className="tabular px-1 text-xs text-muted-foreground">{idx + 1}</span>
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={idx === 0}
                            onClick={() => moveScreenshot(idx, idx - 1)}
                            aria-label={`Move screenshot ${idx + 1} earlier`}
                          >
                            <ArrowLeft strokeWidth={1.75} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={idx === screenshotList.length - 1}
                            onClick={() => moveScreenshot(idx, idx + 1)}
                            aria-label={`Move screenshot ${idx + 1} later`}
                          >
                            <ArrowRight strokeWidth={1.75} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => set("screenshots", screenshotList.filter((_, i) => i !== idx).join(", "))}
                            aria-label={`Remove screenshot ${idx + 1}`}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 strokeWidth={1.75} />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}

              <label htmlFor="pf-screenshots" className="sr-only">
                Screenshot URLs, comma separated
              </label>
              <textarea
                id="pf-screenshots"
                value={v.screenshots}
                onChange={(e) => set("screenshots", e.target.value)}
                placeholder="Paste image URLs separated by commas"
                rows={2}
                className={cn(textareaClass, "resize-none text-[13px]")}
              />
              <UploadButton
                full
                label="Upload screenshots"
                accept="image/*"
                multiple
                busy={uploading === "screenshots"}
                disabled={uploading !== null && uploading !== "screenshots"}
                onFiles={(e) => handleUpload(e, "screenshots")}
              />
            </div>
          </Section>

          <Section id="pf-listing" title="Listing details" description="Search tags, version and visibility.">
            <div className="space-y-2">
              <label htmlFor="pf-tags-input" className={labelClass}>
                Tags <span className="font-normal text-muted-foreground">optional</span>
              </label>
              {tagList.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Selected tags">
                  {tagList.map((tag) => (
                    <li key={tag}>
                      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-secondary pr-1 pl-2.5 text-xs text-foreground">
                        {tag}
                        <button
                          type="button"
                          onClick={() => set("tags", tagList.filter((t) => t !== tag).join(", "))}
                          aria-label={`Remove tag ${tag}`}
                          className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <X className="size-3" strokeWidth={2} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                id="pf-tags-input"
                type="text"
                value={tagDraft}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes(",")) {
                    val.split(",").forEach(addTag);
                    setTagDraft("");
                  } else {
                    setTagDraft(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagDraft);
                    setTagDraft("");
                  } else if (e.key === "Backspace" && !tagDraft && tagList.length > 0) {
                    set("tags", tagList.slice(0, -1).join(", "));
                  }
                }}
                onBlur={() => {
                  if (tagDraft.trim()) {
                    addTag(tagDraft);
                    setTagDraft("");
                  }
                }}
                placeholder="Type a tag and press Enter"
                className={fieldClass}
                aria-describedby="pf-tags-suggest"
              />
              <div id="pf-tags-suggest" className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-xs text-muted-foreground">Suggestions:</span>
                {SUGGESTED_TAGS.filter((t) => !tagList.includes(t)).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="h-6 rounded-full border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            <FieldShell id="pf-version" label="Version">
              <input
                id="pf-version"
                type="text"
                value={v.version}
                onChange={(e) => set("version", e.target.value)}
                placeholder="1.0.0"
                className={cn(fieldClass, "font-mono sm:max-w-40")}
              />
            </FieldShell>

            {!isCreatorConsole ? (
              <div className="space-y-4 border-t border-border pt-5">
                <SwitchRow
                  id="pf-featured"
                  label="Featured"
                  description="Show in featured marketplace placements."
                  checked={v.featured}
                  onCheckedChange={(c) => set("featured", c)}
                />
                <SwitchRow
                  id="pf-published"
                  label="Published"
                  description="Visible and purchasable by customers."
                  checked={v.published}
                  onCheckedChange={(c) => set("published", c)}
                />
                <SwitchRow
                  id="pf-showStats"
                  label="Show stats"
                  description="Display views, downloads and saves on the product page."
                  checked={v.showStats}
                  onCheckedChange={(c) => set("showStats", c)}
                />
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">Stat overrides</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["views", "Views"],
                        ["downloadsCount", "Downloads"],
                        ["saves", "Saves"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <label htmlFor={`pf-${key}`} className="text-xs text-muted-foreground">
                          {label}
                        </label>
                        <input
                          id={`pf-${key}`}
                          type="number"
                          min={0}
                          value={v[key]}
                          onChange={(e) => set(key, e.target.value)}
                          className={cn(fieldClass, "tabular")}
                        />
                      </div>
                    ))}
                  </div>
                </fieldset>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <Link href="/hire-me" className="text-primary underline-offset-4 hover:underline">
                    Hire developer page
                  </Link>
                  <a
                    href="https://www.blogger.com/blog/posts/446251549562029884"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    Blogger posts <ExternalLink className="size-3" strokeWidth={1.75} />
                  </a>
                </p>
              </div>
            ) : null}
          </Section>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:bg-card sm:px-5 sm:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {Object.keys(errors).some((k) => errors[k as FieldKey])
              ? "Fix the highlighted fields to continue."
              : isEdit
                ? "Changes apply when you save."
                : "Your draft is kept in this browser until you submit."}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {isEdit && initialData?.slug ? (
              <Button asChild variant="ghost">
                <Link href={`/products/${initialData.slug}`} target="_blank" rel="noopener noreferrer">
                  View listing <ExternalLink strokeWidth={1.75} />
                </Link>
              </Button>
            ) : null}
            {!isEdit ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => submit(true)}>
                {isPending && submitMode === "draft" ? <Loader2 className="animate-spin" /> : null}
                Save as draft
              </Button>
            ) : null}
            <Button type="submit" disabled={isPending || uploading !== null} className="flex-1 sm:flex-none">
              {isPending && submitMode === "publish" ? <Loader2 className="animate-spin" /> : null}
              {isPending && submitMode === "publish" ? "Saving…" : primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
