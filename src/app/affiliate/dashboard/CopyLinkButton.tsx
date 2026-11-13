"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function CopyLinkButton({
  value,
  label,
  showText = false,
}: {
  value: string;
  /** Accessible name, e.g. "Copy link for Fizzi" */
  label: string;
  showText?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Link copied.");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn’t copy automatically. Select the link and copy it manually.");
    }
  };

  const Icon = copied ? Check : Copy;

  if (showText) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={copy} aria-label={label}>
        <Icon strokeWidth={1.75} className={copied ? "text-success" : undefined} />
        {copied ? "Copied" : "Copy link"}
      </Button>
    );
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label={label}>
      <Icon strokeWidth={1.75} className={copied ? "text-success" : undefined} />
    </Button>
  );
}
