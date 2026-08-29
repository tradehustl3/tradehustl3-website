"use client";

import { useEffect, useState } from "react";
import { trackCheckoutInitiated } from "../analytics";
import { DIRECT_EBOOK_PRODUCT } from "../../shared/customer-config";

const RELEASE_TIME = new Date("2026-09-15T00:00:00-04:00").getTime();

export default function LaunchPurchaseButton() {
  const [isAvailable, setIsAvailable] = useState(false);

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

  return (
    <a
      className="button button-primary ebook-buy-button"
      href={DIRECT_EBOOK_PRODUCT.paymentLink}
      onClick={() => trackCheckoutInitiated(
        DIRECT_EBOOK_PRODUCT.contentName,
        "configured_payment_link",
        DIRECT_EBOOK_PRODUCT.value,
        DIRECT_EBOOK_PRODUCT.currency,
        "session",
      )}
    >
      Buy the eBook — $9.99 <span>↗</span>
    </a>
  );
}
