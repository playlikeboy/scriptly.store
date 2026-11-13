"use client";

import useSWR from "swr";
import { useId, useState } from "react";
import { AlertCircle, CheckCircle2, CornerDownRight, FolderKanban, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

type CategoriesResponse = { success?: boolean; categories?: Category[]; error?: string };
type Kind = "category" | "subcategory";

const fetcher = async (url: string): Promise<CategoriesResponse> => {
  const res = await fetch(url);
  const body = (await res.json()) as CategoriesResponse;
  if (!res.ok) throw new Error(body.error || "Failed to load categories.");
  return body;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const fieldClass =
  "h-10 w-full rounded-[10px] border border-input bg-card px-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
const labelClass = "text-sm font-medium text-foreground";

type Feedback = { kind: Kind; tone: "error" | "success"; message: string } | null;

export default function AdminCategoriesClient({ initialCategories }: { initialCategories?: Category[] }) {
  const { data, error, mutate, isLoading } = useSWR<CategoriesResponse>("/api/admin/categories", fetcher, {
    fallbackData: initialCategories ? { success: true, categories: initialCategories } : undefined,
    revalidateOnMount: !initialCategories,
    revalidateOnFocus: false,
  });
  const ids = useId();

  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catSlugTouched, setCatSlugTouched] = useState(false);

  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subSlugTouched, setSubSlugTouched] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingKind, setPendingKind] = useState<Kind | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryList = data?.categories ?? [];
  const subTotal = categoryList.reduce((sum, c) => sum + c.subcategories.length, 0);

  const handleCreate = async (e: React.FormEvent, type: Kind) => {
    e.preventDefault();
    setFeedback(null);

    const name = (type === "category" ? catName : subName).trim();
    const slug = slugify(type === "category" ? catSlug : subSlug);

    if (!name || !slug) {
      setFeedback({ kind: type, tone: "error", message: "Both name and slug are required." });
      return;
    }
    if (type === "subcategory" && !selectedCatId) {
      setFeedback({ kind: type, tone: "error", message: "Choose a parent category first." });
      return;
    }

    setPendingKind(type);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          slug,
          categoryId: type === "subcategory" ? selectedCatId : undefined,
        }),
      });
      const result = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !result.success) {
        setFeedback({ kind: type, tone: "error", message: result.error || `Could not create the ${type}.` });
      } else {
        setFeedback({ kind: type, tone: "success", message: `${type === "category" ? "Category" : "Subcategory"} “${name}” created.` });
        if (type === "category") {
          setCatName("");
          setCatSlug("");
          setCatSlugTouched(false);
        } else {
          setSubName("");
          setSubSlug("");
          setSubSlugTouched(false);
        }
        mutate();
      }
    } catch (err) {
      console.error(err);
      setFeedback({ kind: type, tone: "error", message: "Network error. Check your connection and try again." });
    } finally {
      setPendingKind(null);
    }
  };

  const handleDelete = async (id: string, name: string, type: Kind) => {
    const warning =
      type === "category"
        ? `Delete the category “${name}” and all of its subcategories?`
        : `Delete the subcategory “${name}”?`;
    if (!window.confirm(warning)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}?type=${type}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Could not delete “${name}”.`);
      }
      toast.success(`“${name}” deleted`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not delete “${name}”.`);
    } finally {
      setDeletingId(null);
    }
  };

  const renderFeedback = (kind: Kind) =>
    feedback && feedback.kind === kind ? (
      <p className={cn("flex items-start gap-2 text-sm", feedback.tone === "error" ? "text-destructive" : "text-success")}>
        {feedback.tone === "error" ? (
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        )}
        {feedback.message}
      </p>
    ) : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-border bg-card lg:sticky lg:top-20">
        <form onSubmit={(e) => handleCreate(e, "category")} className="space-y-4 p-4 sm:p-5" noValidate>
          <div>
            <h2 className="text-sm font-semibold text-foreground">New category</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">A top-level section of the catalog.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-cat-name`} className={labelClass}>
              Name
            </label>
            <input
              id={`${ids}-cat-name`}
              type="text"
              placeholder="Graphic Kits"
              value={catName}
              onChange={(e) => {
                setCatName(e.target.value);
                if (!catSlugTouched) setCatSlug(slugify(e.target.value));
              }}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-cat-slug`} className={labelClass}>
              Slug
            </label>
            <input
              id={`${ids}-cat-slug`}
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="graphic-kits"
              value={catSlug}
              onChange={(e) => {
                setCatSlug(e.target.value);
                setCatSlugTouched(true);
              }}
              className={cn(fieldClass, "font-mono text-[13px]")}
            />
          </div>
          <div aria-live="polite">{renderFeedback("category")}</div>
          <Button type="submit" disabled={pendingKind !== null} className="w-full">
            {pendingKind === "category" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
            Add category
          </Button>
        </form>

        <form onSubmit={(e) => handleCreate(e, "subcategory")} className="space-y-4 border-t border-border p-4 sm:p-5" noValidate>
          <div>
            <h2 className="text-sm font-semibold text-foreground">New subcategory</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Nested under an existing category.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-parent`} className={labelClass}>
              Parent category
            </label>
            <select
              id={`${ids}-parent`}
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className={cn(fieldClass, "cursor-pointer")}
            >
              <option value="">Select a category</option>
              {categoryList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-sub-name`} className={labelClass}>
              Name
            </label>
            <input
              id={`${ids}-sub-name`}
              type="text"
              placeholder="SaaS Landing Pages"
              value={subName}
              onChange={(e) => {
                setSubName(e.target.value);
                if (!subSlugTouched) setSubSlug(slugify(e.target.value));
              }}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-sub-slug`} className={labelClass}>
              Slug
            </label>
            <input
              id={`${ids}-sub-slug`}
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="saas-landing-pages"
              value={subSlug}
              onChange={(e) => {
                setSubSlug(e.target.value);
                setSubSlugTouched(true);
              }}
              className={cn(fieldClass, "font-mono text-[13px]")}
            />
          </div>
          <div aria-live="polite">{renderFeedback("subcategory")}</div>
          <Button type="submit" variant="outline" disabled={pendingKind !== null || categoryList.length === 0} className="w-full">
            {pendingKind === "subcategory" ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
            Add subcategory
          </Button>
        </form>
      </div>

      <section aria-labelledby={`${ids}-list`} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <h2 id={`${ids}-list`} className="text-sm font-semibold text-foreground">
            Taxonomy
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {isLoading && categoryList.length === 0
              ? "Loading…"
              : `${categoryList.length} ${categoryList.length === 1 ? "category" : "categories"} · ${subTotal} sub`}
          </span>
        </div>

        {isLoading && categoryList.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Loading categories
          </div>
        ) : error && categoryList.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <AlertCircle aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-destructive" />
            <p className="text-sm font-medium text-foreground">Couldn’t load categories</p>
            <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Try again."}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
              Retry
            </Button>
          </div>
        ) : categoryList.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <FolderKanban aria-hidden="true" strokeWidth={1.75} className="mb-3 size-5 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No categories yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add the first category with the form.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {categoryList.map((cat) => (
              <li key={cat.id} className="px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{cat.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">/{cat.slug}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {cat.subcategories.length} sub
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={deletingId === cat.id}
                    onClick={() => handleDelete(cat.id, cat.name, "category")}
                    aria-label={`Delete category ${cat.name}`}
                    title="Delete category"
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deletingId === cat.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </div>

                {cat.subcategories.length > 0 ? (
                  <ul className="mt-2 space-y-0.5">
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id} className="group flex items-center gap-2 rounded-lg py-1 pr-0 pl-1 transition-colors hover:bg-secondary/50">
                        <CornerDownRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {sub.name}
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground">/{sub.slug}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={deletingId === sub.id}
                          onClick={() => handleDelete(sub.id, sub.name, "subcategory")}
                          aria-label={`Delete subcategory ${sub.name}`}
                          title="Delete subcategory"
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          {deletingId === sub.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 pl-1 text-xs text-muted-foreground">No subcategories</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
