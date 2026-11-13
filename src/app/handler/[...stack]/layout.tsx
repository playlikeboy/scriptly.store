import { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Account & Authentication | ScriptlyStore",
  description: "Secure account authentication and profile management on ScriptlyStore.",
};

interface AuthLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    stack?: string[];
  }>;
}

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  const resolvedParams = await params;
  const stack = resolvedParams.stack || [];
  const currentRoute = stack[0] || "";
  const isAccountSettings = currentRoute === "account-settings";

  if (isAccountSettings) {
    return (
      <div className="bg-background text-foreground">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 md:py-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:underline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to dashboard
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-success" />
              Secured by Hexclave
            </span>
          </div>

          <header className="border-b border-border pb-6">
            <h1 className="font-display text-3xl text-balance text-foreground md:text-4xl">Account settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-pretty text-muted-foreground">
              Manage your developer profile, linked emails, multi-factor authentication and active sessions.
            </p>
          </header>

          <div className="min-h-[500px] overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-8">
            <div className="hexclave-auth-container w-full">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  // Auth pages (sign-in, sign-up, forgot-password, etc.)
  const isSignUp = currentRoute === "sign-up";
  const isForgotPassword = currentRoute === "forgot-password";

  let title = "Welcome back";
  let subtitle = "Sign in to access your digital assets and scripts.";

  if (isSignUp) {
    title = "Create your account";
    subtitle = "Join ScriptlyStore to download and sell developer assets.";
  } else if (isForgotPassword) {
    title = "Reset your password";
    subtitle = "Enter your email to receive recovery instructions.";
  }

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center bg-background px-4 py-10 text-foreground sm:py-16">
      <div className="w-full max-w-[440px] space-y-5">
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] sm:p-8">
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="font-display text-3xl text-balance text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <div className="hexclave-auth-container">{children}</div>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          Authentication secured by Hexclave
        </p>
      </div>
    </div>
  );
}
