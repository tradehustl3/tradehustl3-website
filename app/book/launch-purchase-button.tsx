"use client";

import { useEffect, useState } from "react";
import { createTrackedCheckout } from "../meta-commerce";

const RELEASE_TIME = new Date("2026-09-15T00:00:00-04:00").getTime();

export default function LaunchPurchaseButton() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const updateAvailability = () => setIsAvailable(Date.now() >= RELEASE_TIME);
    updateAvailability();
    const timer = window.setInterval(updateAvailability, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  if (!isAvailable) {
    return (
      <div className="ebook-launch-gate" aria-label="The direct eBook launches September 15, 2026">
        <span>Direct eBook · $9.99</span>
        <strong>Available September 15</strong>
        <small>Secure PDF delivered by email immediately after purchase.</small>
      </div>
    );
  }

  async function startCheckout() {
    setIsOpening(true);
    setMessage("");
    try {
      const checkout = await createTrackedCheckout("/api/ebook-checkout", "ebook");
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Secure checkout is temporarily unavailable.");
      setIsOpening(false);
    }
  }

  return (
    <div>
      <button className="button button-primary ebook-buy-button" type="button" disabled={isOpening} onClick={() => void startCheckout()}>
        {isOpening ? "Opening secure checkout…" : "Buy the eBook — $9.99"} <span>↗</span>
      </button>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
