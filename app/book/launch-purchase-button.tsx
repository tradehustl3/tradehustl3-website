"use client";

import { useEffect, useState } from "react";

const RELEASE_TIME = new Date("2026-09-15T00:00:00-04:00").getTime();
const EBOOK_PAYMENT_LINK = "https://buy.stripe.com/4gM6oAbUd2oc5dNfhwbfO00";

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
      <div className="ebook-launch-gate" aria-label="Preorder the direct eBook for September 15, 2026">
        <span>Direct eBook preorder · $9.00</span>
        <a className="button button-primary ebook-buy-button" href={EBOOK_PAYMENT_LINK}>
          Preorder the eBook — $9.00 <span>↗</span>
        </a>
        <small>Preorder now. Your private download link will be emailed September 15, 2026.</small>
      </div>
    );
  }

  return (
    <a className="button button-primary ebook-buy-button" href={EBOOK_PAYMENT_LINK}>
      Buy the eBook — $9.00 <span>↗</span>
    </a>
  );
}
