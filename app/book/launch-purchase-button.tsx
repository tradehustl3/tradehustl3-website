"use client";

const EBOOK_PAYMENT_LINK = "https://buy.stripe.com/4gM5kwaQ96EscGf2uKbfO02";

export default function LaunchPurchaseButton() {
  return (
    <a className="button button-primary ebook-buy-button" href={EBOOK_PAYMENT_LINK}>
      Buy the eBook — $9.99 <span>↗</span>
    </a>
  );
}
