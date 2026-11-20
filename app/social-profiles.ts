/**
 * Single source of truth for TRADE HUSTL3's public social profiles.
 *
 * Read by the footer icon rows (app/social-links.tsx, app/footer-enhancements.tsx),
 * the Organization structured data in app/layout.tsx and the /links page that the
 * printed QR code opens. Add or change a profile here and every surface follows.
 */
export const SOCIAL_PROFILES = {
  facebook: { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61593457675674" },
  instagram: { label: "Instagram", href: "https://www.instagram.com/tradehustl3/" },
  tiktok: { label: "TikTok", href: "https://www.tiktok.com/@da.maintenance.ma5" },
  youtube: { label: "YouTube", href: "https://www.youtube.com/@tradehustl3" },
  linkedin: { label: "LinkedIn", href: "https://www.linkedin.com/company/trade-hustl3-llc/" },
} as const;

export type SocialProfileId = keyof typeof SOCIAL_PROFILES;

/** Display order used wherever the profiles appear as a list. */
export const SOCIAL_PROFILE_ORDER: readonly SocialProfileId[] = ["facebook", "instagram", "tiktok", "youtube", "linkedin"];

/** Profile URLs for schema.org `sameAs`. */
export const SOCIAL_PROFILE_URLS: readonly string[] = SOCIAL_PROFILE_ORDER.map((id) => SOCIAL_PROFILES[id].href);
