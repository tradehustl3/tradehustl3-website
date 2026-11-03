import { DIRECT_EBOOK } from "./editions";

export default function LaunchPurchaseButton({ location = "book-availability" }: { location?: string }) {
  return (
    <a
      className="button button-primary ebook-buy-button"
      href={DIRECT_EBOOK.url}
      data-cta="direct-ebook"
      data-cta-location={location}
    >
      Buy the eBook — ${DIRECT_EBOOK.price} <span>↗</span>
    </a>
  );
}
