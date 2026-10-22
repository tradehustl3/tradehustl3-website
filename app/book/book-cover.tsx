export const BOOK_COVER_IMAGE = "/optimized/book-cover-v3.webp";

const AVIF_SOURCES = [400, 600, 800]
  .map((width) => `/optimized/book-cover-v3-${width}.avif ${width}w`)
  .join(", ");

/** Prebuilt sizes also work when the runtime image optimizer is disabled. */
export function BookCover({ className, alt, sizes, priority = false }: {
  className?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={AVIF_SOURCES} sizes={sizes} />
      <img
        className={className}
        src={BOOK_COVER_IMAGE}
        alt={alt}
        width={600}
        height={900}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}
