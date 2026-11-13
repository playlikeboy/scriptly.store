"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyCodeButton({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("error");
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} aria-label={`Copy coupon code ${code}`}>
      {state === "copied" ? (
        <Check className="size-3.5 text-success" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      )}
      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "error" ? "Copy failed" : "Copy code"}
      </span>
    </Button>
  );
}
