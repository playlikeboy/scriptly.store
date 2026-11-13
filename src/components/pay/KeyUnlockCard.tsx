"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyUnlockCardProps {
  token: string;
  initialError?: string | null;
}

export default function KeyUnlockCard({ token, initialError }: KeyUnlockCardProps) {
  const router = useRouter();
  const inputId = useId();
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState(initialError || "");
  // Pending covers the whole navigation, so the button never sticks in "Unlocking".
  const [isPending, startTransition] = useTransition();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError("Enter the access key the seller gave you.");
      return;
    }

    setError("");
    const params = new URLSearchParams();
    params.set("data", token);
    params.set("key", keyInput.trim());
    startTransition(() => {
      router.push(`/pay?${params.toString()}`);
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
      <KeyRound className="size-6 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
      <h1 className="mt-4 font-display text-2xl text-foreground">Enter the access key</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This payment link was encrypted by the creator using a private security key. Enter the key below to access
        checkout.
      </p>

      <form onSubmit={handleUnlock} className="mt-6 space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            Access key
          </label>
          <Input
            id={inputId}
            type="password"
            autoComplete="off"
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              if (error) setError("");
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="h-11"
            autoFocus
          />
          {error && (
            <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending} className="w-full">
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isPending ? "Unlocking…" : "Unlock checkout"}
        </Button>
      </form>

      <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
        256-bit AES authenticated encryption
      </p>
    </div>
  );
}
