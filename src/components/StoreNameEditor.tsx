"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateCreatorStoreNameAction } from "@/lib/actions/creator";
import { Button } from "@/components/ui/button";
import { Panel, errorTextClass, fieldClass, hintClass, labelClass } from "@/components/creator/console-ui";

const MAX = 50;

interface StoreNameEditorProps {
  initialStoreName: string | null;
}

export default function StoreNameEditor({ initialStoreName }: StoreNameEditorProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialStoreName || "");
  const [storeName, setStoreName] = useState(initialStoreName || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = storeName.trim();
  const tooLong = trimmed.length > MAX;
  const dirty = trimmed !== saved.trim();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (tooLong) {
      setError(`Keep it under ${MAX} characters.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateCreatorStoreNameAction(trimmed);
        if (res?.success) {
          setSaved(trimmed);
          toast.success(trimmed ? "Store name saved." : "Store name cleared.");
          router.refresh();
        } else {
          setError("Could not save your store name. Try again.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save your store name. Try again.");
      }
    });
  };

  return (
    <Panel title="Store name" description="Shown on your product pages and public creator profile.">
      <form onSubmit={handleSave} className="space-y-4 p-4 sm:p-5">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="store-name" className={labelClass}>
              Public store name
            </label>
            <span className={`tabular text-xs ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
              {trimmed.length}/{MAX}
            </span>
          </div>
          <input
            id="store-name"
            type="text"
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Acme Studio"
            autoComplete="organization"
            aria-invalid={tooLong || Boolean(error)}
            aria-describedby={error ? "store-name-error" : "store-name-hint"}
            className={fieldClass}
          />
          {error ? (
            <p id="store-name-error" role="alert" className={errorTextClass}>
              {error}
            </p>
          ) : (
            <p id="store-name-hint" className={hintClass}>
              Leave empty to use your account name.
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          {!dirty && saved ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3.5 text-success" strokeWidth={1.75} /> Saved
            </span>
          ) : null}
          <Button type="submit" disabled={isPending || !dirty || tooLong}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {isPending ? "Saving…" : "Save name"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
