export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getOrCreateDbUser } from "@/lib/auth-utils";
import StoreNameEditor from "@/components/StoreNameEditor";
import { PageHeader } from "@/components/creator/console-ui";

export const metadata: Metadata = {
  title: "Store Branding | Creator Console",
  description: "Configure your public storefront name and developer identity.",
};

export default async function CreatorStorePage() {
  const user = await getOrCreateDbUser();
  if (!user) {
    redirect("/handler/sign-in?redirectTo=/creator/store");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Storefront"
        description="How your store appears to buyers across the marketplace."
      />

      <div className="max-w-xl space-y-4">
        <StoreNameEditor initialStoreName={user.storeName} />
        <p className="text-sm text-muted-foreground">
          Your public store lives at{" "}
          <Link
            href={`/stores/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline"
          >
            <span className="font-mono text-xs break-all">/stores/{user.id}</span>
            <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span className="sr-only">(opens in a new tab)</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
