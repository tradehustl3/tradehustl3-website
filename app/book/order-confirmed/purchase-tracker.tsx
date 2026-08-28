"use client";

import { useEffect } from "react";
import { trackVerifiedMetaPurchase, type VerifiedPurchase } from "../../meta-commerce";

/** Waits for webhook fulfillment before emitting the eBook Purchase event. */
export function PurchaseTracker() {
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";
    if (!sessionId) return;

    let attempts = 0;
    let stopped = false;
    const check = async () => {
      if (stopped) return;
      try {
        const response = await fetch(`/api/ebook-order-status?session_id=${encodeURIComponent(sessionId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const result = await response.json() as VerifiedPurchase;
        if (response.ok && trackVerifiedMetaPurchase(result, "ebook")) {
          stopped = true;
          return;
        }
      } catch {
        // Tracking must not affect the confirmation page.
      }
      attempts += 1;
      if (attempts < 12 && !stopped) window.setTimeout(() => void check(), 2_000);
    };
    void check();
    return () => { stopped = true; };
  }, []);

  return null;
}
