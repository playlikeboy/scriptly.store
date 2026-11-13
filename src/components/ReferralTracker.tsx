"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { recordReferralClickAction } from "@/lib/actions/affiliates";

function readFlag(key: string) {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    sessionStorage.setItem(key, "true");
  } catch {
    // Storage blocked (private mode): tracking still ran once.
  }
}

function TrackerContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (!ref) return;

    // Prevent duplicate click tracking in the same browser session
    const trackingKey = `ref_tracked_${ref}_${pathname}`;
    if (readFlag(trackingKey)) return;

    recordReferralClickAction({
      ref,
      referrerUrl: document.referrer || undefined,
    })
      .then((res) => {
        if (res.success) writeFlag(trackingKey);
      })
      .catch(() => {
        // Non-critical: never surface referral tracking failures to the visitor.
      });
  }, [ref, pathname]);

  return null;
}

export default function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerContent />
    </Suspense>
  );
}
