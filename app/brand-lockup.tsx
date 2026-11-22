import Image from "next/image";
import styles from "./brand-lockup.module.css";

/**
 * The TRADE HUSTL3 header lockup: the TH3 mark with the brand message
 * "ENTER • EARN • ELEVATE" in gold underneath. It sits on its own navy plate,
 * so it reads the same on dark and light page headers. The transparent
 * appearance lets the existing transparent mark sit directly on a page background.
 *
 * Render it inside the page's home link; the link carries the accessible name.
 */
export function BrandLockup({ size = "md", priority = true, appearance = "plate" }: { size?: "sm" | "md" | "lg"; priority?: boolean; appearance?: "plate" | "transparent" }) {
  return (
    <span className={styles.lockup} data-size={size} data-appearance={appearance}>
      <Image className={styles.mark} src="/optimized/th3-logo-header.webp" alt="TRADE HUSTL3 logo" width={248} height={160} priority={priority} />
      <span className={styles.tagline}>ENTER • EARN • ELEVATE</span>
    </span>
  );
}
