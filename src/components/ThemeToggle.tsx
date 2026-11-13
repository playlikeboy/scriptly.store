"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Icons swap via the `dark` class next-themes sets before paint, so no
  // mounted-state placeholder is needed to avoid a hydration mismatch.
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Switch between light and dark theme"
    >
      <Sun className="size-4 dark:hidden" strokeWidth={1.75} aria-hidden="true" />
      <Moon className="hidden size-4 dark:block" strokeWidth={1.75} aria-hidden="true" />
    </Button>
  );
}
