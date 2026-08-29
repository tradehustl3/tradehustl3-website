"use client";

import { useEffect, useState } from "react";
import { trackVerifiedPurchase, type VerifiedPurchase } from "../../analytics";

const RELEASE_TIME = new Date("2026-09-15T00:00:00-04:00").getTime();

export function OrderConfirmationCopy() {
  const [isReleased] = useState(() => Date.now() >= RELEASE_TIME);
  const [finalizing, setFinalizing] = useState(false);

  // Stripe only redirects here after a successful Payment Link checkout, so the
  // reassurance copy always shows. Server verification runs quietly in the
  // background for one purpose: the Meta/GA `Purchase` event must never fire on
  // the redirect alone, only once the signed webhook has recorded a paid,
  // unrefunded D1 order. If the session id is absent (Payment Link redirect not
  // yet configured with {CHECKOUT_SESSION_ID}) the page still confirms the
  // order; only the pixel Purchase event is withheld.
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id")?.trim() ?? "";
    if (!sessionId) return;

    let stopped = false;
    let attempts = 0;
    const check = async () => {
      if (attempts === 0 && !stopped) setFinalizing(true);
      try {
        const response = await fetch(`/api/ebook-order-status?session_id=${encodeURIComponent(sessionId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const result = await response.json() as VerifiedPurchase;
        if (response.ok && result.verified) {
          trackVerifiedPurchase(result, "ebook");
          if (!stopped) setFinalizing(false);
          return;
        }
      } catch {
        // The signed payment confirmation may not have landed yet; keep polling.
      }
      attempts += 1;
      if (!stopped && attempts < 12) window.setTimeout(() => void check(), 2_000);
      else if (!stopped) setFinalizing(false);
    };
    void check();
    return () => { stopped = true; };
  }, []);

  const finalizingNote = finalizing
    ? <span role="status">Finalizing your receipt with the secure payment provider…</span>
    : null;

  if (isReleased) {
    return (
      <>
        <p className="section-label">/ PAYMENT CONFIRMED</p>
        <h1>YOU’RE IN.<br /><span>LET’S BUILD.</span></h1>
        <p>
          Your TRADE HUSTL3 eBook purchase is complete. Your private download link is being sent to the email address used at checkout.
        </p>
        <div className="order-confirmed-note">
          <strong>Check your inbox and spam folder.</strong>
          <span>The delivery email will come from TRADE HUSTL3. Keep it for future downloads.</span>
          <span>Need help? <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a></span>
          {finalizingNote}
        </div>
      </>
    );
  }

  return (
    <>
      <p className="section-label">/ PREORDER CONFIRMED</p>
      <h1>YOU’RE IN.<br /><span>LAUNCH LOCKED.</span></h1>
      <p>
        Your $9.99 TRADE HUSTL3 eBook preorder is confirmed. You were charged today, and your private download will be emailed on September 15, 2026.
      </p>
      <div className="order-confirmed-note">
        <strong>Keep your confirmation email.</strong>
        <span>A second email containing your private download link will arrive from TRADE HUSTL3 on release day.</span>
        <span>Need help? <a href="mailto:support@tradehustl3.com">support@tradehustl3.com</a></span>
        {finalizingNote}
      </div>
    </>
  );
}
